package id.vianjaya.kasir.cabang1;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Locale;

/**
 * USB Host transport for ESC/POS printers such as the Comson 80 mm USB & LAN model.
 *
 * <p>Android exposes USB printers without a driver, so the printer interface is claimed and the
 * raw ESC/POS bytes are pushed to its bulk OUT endpoint. The permission dialog is handled once;
 * afterwards the granted device can be reopened for every job.
 */
public final class UsbPrinter {
    private static final String ACTION_USB_PERMISSION = "id.vianjaya.kasir.cabang1.USB_PERMISSION";
    private static final String PREFS = "printer_diagnostics";
    private static final String KEY_DEVICE = "usb_device_name";
    private static final String KEY_VENDOR = "usb_vendor_id";
    private static final String KEY_PRODUCT = "usb_product_id";
    private static final int USB_CLASS_PRINTER = 7;
    private static final int TRANSFER_TIMEOUT_MS = 5000;
    private static final int CHUNK_BYTES = 16384;
    private static final int MAX_ATTEMPTS = 2;
    private static final long RETRY_GAP_MS = 300L;
    private static final long PERMISSION_TIMEOUT_MS = 15000L;
    private static final String NOT_READY_MESSAGE =
            "Printer USB tidak merespons. Cabut lalu pasang kembali kabel USB dan izinkan akses printer.";

    private final Activity activity;
    private final UsbManager manager;
    private final Object permissionLock = new Object();
    private final SharedPreferences prefs;
    private volatile String connectionState = "idle";
    private volatile String lastError = "";
    private volatile int bytesSent;
    private volatile String connectedDeviceId = "";
    private volatile String connectedDeviceName = "";
    private volatile boolean pendingPermission;
    private volatile boolean pendingGranted;
    private volatile boolean receiverRegistered;

    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_USB_PERMISSION.equals(action)) {
                boolean granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
                synchronized (permissionLock) {
                    pendingGranted = granted;
                    pendingPermission = true;
                    permissionLock.notifyAll();
                }
                return;
            }
            if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                UsbDevice device = deviceFrom(intent);
                if (device != null && device.getDeviceName().equals(connectedDeviceId)) {
                    connectedDeviceId = "";
                    connectedDeviceName = "";
                    connectionState = "idle";
                }
            }
        }
    };

    public UsbPrinter(Activity activity) {
        this.activity = activity;
        this.manager = (UsbManager) activity.getSystemService(Context.USB_SERVICE);
        this.prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        this.connectedDeviceId = prefs.getString(KEY_DEVICE, "");
        this.connectedDeviceName = prefs.getString(KEY_DEVICE, "");
        registerReceiver();
    }

    public String connectionState() {
        return connectionState;
    }

    public String connectedDeviceId() {
        return connectedDeviceId;
    }

    public JSONArray listDevices() {
        JSONArray devices = new JSONArray();
        try {
            HashMap<String, UsbDevice> connected = manager == null ? new HashMap<>() : manager.getDeviceList();
            for (UsbDevice device : connected.values()) {
                JSONObject entry = new JSONObject();
                UsbEndpoint endpoint = findOutEndpoint(device);
                entry.put("deviceId", device.getDeviceName());
                entry.put("name", displayName(device));
                entry.put("vendorId", device.getVendorId());
                entry.put("productId", device.getProductId());
                entry.put("hasPermission", manager != null && manager.hasPermission(device));
                entry.put("printable", endpoint != null);
                devices.put(entry);
            }
        } catch (Exception ignored) {
        }
        return devices;
    }

    public JSONObject connect(String deviceId) {
        UsbDevice device = findDevice(deviceId);
        if (device == null) {
            return failure("usb-not-found",
                    "Printer USB tidak ditemukan. Pasang kabel USB lalu coba lagi.", 0);
        }
        if (!ensurePermission(device)) {
            return failure("usb-permission-denied",
                    "Izin USB ditolak. Cabut lalu pasang kembali printer dan pilih Izinkan.", 0);
        }
        UsbEndpoint endpoint = findOutEndpoint(device);
        if (endpoint == null) {
            return failure("usb-no-endpoint",
                    "Perangkat USB ini tidak menyediakan endpoint cetak ESC/POS.", 0);
        }
        markConnected(device);
        return success(0, 0);
    }

    public JSONObject print(byte[] data, String paperWidth) {
        String deviceId = connectedDeviceId;
        if (deviceId == null || deviceId.isEmpty()) deviceId = prefs.getString(KEY_DEVICE, "");
        if (deviceId == null || deviceId.isEmpty()) {
            return failure("usb-no-device", "Printer USB belum dipilih. Buka Setup Printer lalu hubungkan.", 0);
        }

        String errorClass = "usb-print-failed";
        String errorMessage = NOT_READY_MESSAGE;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            UsbDevice device = findDevice(deviceId);
            if (device == null) {
                errorClass = "usb-not-found";
                errorMessage = "Printer USB terlepas. Pasang kembali kabel USB.";
            } else if (!ensurePermission(device)) {
                errorClass = "usb-permission-denied";
                errorMessage = "Izin USB belum diberikan.";
            } else {
                UsbDeviceConnection connection = null;
                try {
                    UsbEndpoint endpoint = findOutEndpoint(device);
                    if (endpoint == null) {
                        errorClass = "usb-no-endpoint";
                        errorMessage = "Endpoint cetak USB tidak ditemukan.";
                    } else {
                        connection = manager == null ? null : manager.openDevice(device);
                        if (connection == null) {
                            errorClass = "usb-open-failed";
                            errorMessage = "Printer USB tidak dapat dibuka. Lepas lalu pasang kembali.";
                        } else {
                            UsbInterface usbInterface = findInterface(device, endpoint);
                            boolean claimed = connection.claimInterface(usbInterface, true);
                            if (!claimed) claimed = connection.claimInterface(usbInterface, false);
                            if (!claimed) {
                                errorClass = "usb-claim-failed";
                                errorMessage = "Printer USB sedang dipakai aplikasi lain.";
                            } else {
                                try {
                                    write(connection, endpoint, data);
                                    bytesSent = data.length;
                                    markConnected(device);
                                    return success(data.length, attempt);
                                } finally {
                                    try {
                                        connection.releaseInterface(usbInterface);
                                    } catch (Exception ignored) {
                                    }
                                }
                            }
                        }
                    }
                } catch (Throwable error) {
                    errorClass = "usb-print-failed";
                    errorMessage = error.getMessage() == null ? NOT_READY_MESSAGE : error.getMessage();
                } finally {
                    if (connection != null) {
                        try {
                            connection.close();
                        } catch (Exception ignored) {
                        }
                    }
                }
            }
            if (attempt < MAX_ATTEMPTS) sleep(RETRY_GAP_MS);
        }
        return failure(errorClass, errorMessage, MAX_ATTEMPTS);
    }

    public void disconnect() {
        connectedDeviceId = "";
        connectedDeviceName = "";
        connectionState = "idle";
    }

    public void shutdown() {
        if (!receiverRegistered) return;
        try {
            activity.unregisterReceiver(usbReceiver);
        } catch (Exception ignored) {
        }
        receiverRegistered = false;
    }

    public JSONObject snapshot() {
        JSONObject result = new JSONObject();
        try {
            result.put("connectionState", connectionState);
            result.put("usbDeviceId", connectedDeviceId);
            result.put("usbDeviceName", connectedDeviceName);
            result.put("bytesSent", bytesSent);
        } catch (Exception ignored) {
        }
        return result;
    }

    private void write(UsbDeviceConnection connection, UsbEndpoint endpoint, byte[] data) {
        int offset = 0;
        while (offset < data.length) {
            int length = Math.min(CHUNK_BYTES, data.length - offset);
            int sent = connection.bulkTransfer(endpoint, data, offset, length, TRANSFER_TIMEOUT_MS);
            if (sent <= 0) {
                throw new IllegalStateException("Transfer USB gagal pada byte " + offset + " (kode " + sent + ")");
            }
            offset += sent;
            // A printer with a small buffer needs a breath between chunks.
            if (offset < data.length) sleep(10L);
        }
        sleep(150L);
    }

    private UsbDevice findDevice(String deviceId) {
        if (manager == null) return null;
        HashMap<String, UsbDevice> connected = manager.getDeviceList();
        if (deviceId != null && !deviceId.isEmpty()) {
            for (UsbDevice device : connected.values()) {
                if (device.getDeviceName().equals(deviceId)) return device;
            }
        }
        int vendor = prefs.getInt(KEY_VENDOR, -1);
        int product = prefs.getInt(KEY_PRODUCT, -1);
        if (vendor >= 0 && product >= 0) {
            for (UsbDevice device : connected.values()) {
                if (device.getVendorId() == vendor && device.getProductId() == product) return device;
            }
        }
        return null;
    }

    private UsbEndpoint findOutEndpoint(UsbDevice device) {
        if (device == null) return null;
        for (int index = 0; index < device.getInterfaceCount(); index++) {
            UsbInterface usbInterface = device.getInterface(index);
            for (int endpointIndex = 0; endpointIndex < usbInterface.getEndpointCount(); endpointIndex++) {
                UsbEndpoint endpoint = usbInterface.getEndpoint(endpointIndex);
                if (isBulkOut(endpoint) && usbInterface.getInterfaceClass() == USB_CLASS_PRINTER) {
                    return endpoint;
                }
            }
        }
        for (int index = 0; index < device.getInterfaceCount(); index++) {
            UsbInterface usbInterface = device.getInterface(index);
            for (int endpointIndex = 0; endpointIndex < usbInterface.getEndpointCount(); endpointIndex++) {
                UsbEndpoint endpoint = usbInterface.getEndpoint(endpointIndex);
                if (isBulkOut(endpoint)) return endpoint;
            }
        }
        return null;
    }

    private UsbInterface findInterface(UsbDevice device, UsbEndpoint endpoint) {
        for (int index = 0; index < device.getInterfaceCount(); index++) {
            UsbInterface usbInterface = device.getInterface(index);
            for (int endpointIndex = 0; endpointIndex < usbInterface.getEndpointCount(); endpointIndex++) {
                if (usbInterface.getEndpoint(endpointIndex) == endpoint) return usbInterface;
            }
        }
        return device.getInterface(0);
    }

    private boolean isBulkOut(UsbEndpoint endpoint) {
        return endpoint != null
                && endpoint.getDirection() == UsbConstants.USB_DIR_OUT
                && endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK;
    }

    private boolean ensurePermission(UsbDevice device) {
        if (manager == null) return false;
        if (manager.hasPermission(device)) return true;
        return requestPermission(device);
    }

    private boolean requestPermission(UsbDevice device) {
        synchronized (permissionLock) {
            pendingPermission = false;
            pendingGranted = false;
            try {
                Intent intent = new Intent(ACTION_USB_PERMISSION).setPackage(activity.getPackageName());
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    flags |= PendingIntent.FLAG_MUTABLE;
                }
                PendingIntent pendingIntent = PendingIntent.getBroadcast(activity, 0, intent, flags);
                activity.runOnUiThread(() -> manager.requestPermission(device, pendingIntent));
                long deadline = System.currentTimeMillis() + PERMISSION_TIMEOUT_MS;
                while (!pendingPermission) {
                    long remaining = deadline - System.currentTimeMillis();
                    if (remaining <= 0) break;
                    try {
                        permissionLock.wait(remaining);
                    } catch (InterruptedException error) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
                return pendingGranted;
            } catch (Throwable error) {
                lastError = error.getMessage() == null ? NOT_READY_MESSAGE : error.getMessage();
                return false;
            }
        }
    }

    private void markConnected(UsbDevice device) {
        connectionState = "connected";
        lastError = "";
        connectedDeviceId = device.getDeviceName();
        connectedDeviceName = displayName(device);
        prefs.edit()
                .putString(KEY_DEVICE, connectedDeviceId)
                .putInt(KEY_VENDOR, device.getVendorId())
                .putInt(KEY_PRODUCT, device.getProductId())
                .apply();
    }

    private String displayName(UsbDevice device) {
        try {
            String product = device.getProductName();
            if (product != null && !product.trim().isEmpty()) return product;
        } catch (Throwable ignored) {
        }
        try {
            String manufacturer = device.getManufacturerName();
            if (manufacturer != null && !manufacturer.trim().isEmpty()) return manufacturer;
        } catch (Throwable ignored) {
        }
        return String.format(Locale.US, "USB Printer %04X:%04X", device.getVendorId(), device.getProductId());
    }

    private void registerReceiver() {
        try {
            IntentFilter filter = new IntentFilter();
            filter.addAction(ACTION_USB_PERMISSION);
            filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
            ContextCompat.registerReceiver(activity, usbReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
            receiverRegistered = true;
        } catch (Throwable error) {
            lastError = error.getMessage() == null ? "Gagal mendaftarkan penerima USB" : error.getMessage();
        }
    }

    @SuppressWarnings("deprecation")
    private UsbDevice deviceFrom(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice.class);
        }
        return intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
    }

    private JSONObject success(int sent, int attempts) {
        try {
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("status", "printed");
            result.put("error", JSONObject.NULL);
            result.put("errorClass", "");
            result.put("userMessage", JSONObject.NULL);
            result.put("attempts", attempts);
            result.put("bytesSent", sent);
            result.put("connectResult", "usb-bulk");
            return result;
        } catch (Exception ignored) {
            return new JSONObject();
        }
    }

    private JSONObject failure(String errorClass, String userMessage, int attempts) {
        connectionState = "error";
        lastError = userMessage;
        try {
            JSONObject result = new JSONObject();
            result.put("ok", false);
            result.put("status", "failed");
            result.put("error", userMessage);
            result.put("errorClass", errorClass);
            result.put("userMessage", userMessage);
            result.put("attempts", attempts);
            result.put("bytesSent", bytesSent);
            result.put("connectResult", "usb-bulk");
            return result;
        } catch (Exception ignored) {
            return new JSONObject();
        }
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
        }
    }
}
