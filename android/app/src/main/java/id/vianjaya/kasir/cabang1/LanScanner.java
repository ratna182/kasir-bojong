package id.vianjaya.kasir.cabang1;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.Socket;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Finds ESC/POS network printers by probing port 9100 on the current /24 LAN.
 *
 * <p>The printer's IP is often unknown in the field, so the setup screen can scan the same subnet
 * as the tablet. The scan is bounded (a few seconds) and always leaves manual IP entry available,
 * because guest WiFi commonly enables client isolation and hides every neighbour.
 */
public final class LanScanner {
    private static final int SCAN_THREADS = 32;
    private static final int DEFAULT_TIMEOUT_MS = 8000;
    private static final int MAX_TIMEOUT_MS = 15000;
    private static final int HOST_TIMEOUT_MS = 400;

    private LanScanner() {
    }

    public static JSONObject scan(Context context, int requestedPort, int requestedTimeoutMs) {
        int port = LanPrinter.normalizePort(requestedPort);
        int budget = requestedTimeoutMs <= 0
                ? DEFAULT_TIMEOUT_MS
                : Math.min(requestedTimeoutMs, MAX_TIMEOUT_MS);
        long startedAt = System.currentTimeMillis();

        List<Inet4Address> locals = localAddresses(context);
        if (locals.isEmpty()) {
            return failure("lan-no-network",
                    "Perangkat tidak terhubung ke WiFi/LAN. Sambungkan ke jaringan yang sama dengan printer.");
        }

        Set<String> targets = new LinkedHashSet<>();
        String primaryLocal = "";
        String subnet = "";
        for (Inet4Address local : locals) {
            byte[] raw = local.getAddress();
            int ip = ((raw[0] & 0xFF) << 24) | ((raw[1] & 0xFF) << 16)
                    | ((raw[2] & 0xFF) << 8) | (raw[3] & 0xFF);
            int base = ip & 0xFFFFFF00;
            if (primaryLocal.isEmpty()) {
                primaryLocal = local.getHostAddress();
                subnet = ipString(base) + "/24";
            }
            for (int host = 1; host <= 254; host++) {
                int address = base | host;
                if (address == ip) continue;
                targets.add(ipString(address));
            }
        }

        Set<String> found = ConcurrentHashMap.newKeySet();
        ExecutorService pool = Executors.newFixedThreadPool(SCAN_THREADS);
        CountDownLatch done = new CountDownLatch(targets.size());
        for (final String target : targets) {
            pool.submit(() -> {
                Socket socket = null;
                try {
                    socket = new Socket();
                    socket.connect(new InetSocketAddress(target, port), HOST_TIMEOUT_MS);
                    found.add(target);
                } catch (Throwable ignored) {
                } finally {
                    if (socket != null) {
                        try {
                            socket.close();
                        } catch (Exception ignored) {
                        }
                    }
                    done.countDown();
                }
            });
        }

        try {
            done.await(budget, TimeUnit.MILLISECONDS);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
        }
        pool.shutdownNow();

        List<String> hosts = new ArrayList<>(found);
        Collections.sort(hosts, (left, right) -> Integer.compare(toInt(left), toInt(right)));

        JSONObject result = new JSONObject();
        try {
            result.put("ok", true);
            result.put("localIp", primaryLocal);
            result.put("subnet", subnet);
            result.put("port", port);
            result.put("scanned", targets.size());
            result.put("elapsedMs", System.currentTimeMillis() - startedAt);
            result.put("hosts", new JSONArray(hosts));
            result.put("userMessage", hosts.isEmpty()
                    ? "Tidak ada printer yang ditemukan otomatis. Masukkan IP printer secara manual."
                    : JSONObject.NULL);
        } catch (Exception ignored) {
        }
        return result;
    }

    private static List<Inet4Address> localAddresses(Context context) {
        List<Inet4Address> addresses = new ArrayList<>();
        try {
            ConnectivityManager manager =
                    (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            Network active = manager == null ? null : manager.getActiveNetwork();
            NetworkCapabilities capabilities =
                    active == null || manager == null ? null : manager.getNetworkCapabilities(active);
            boolean lanTransport = capabilities != null
                    && (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                    || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
            if (!lanTransport) return addresses;

            LinkProperties properties = manager.getLinkProperties(active);
            if (properties != null) {
                for (LinkAddress link : properties.getLinkAddresses()) {
                    InetAddress address = link.getAddress();
                    if (isUsable(address)) addresses.add((Inet4Address) address);
                }
            }
        } catch (Throwable ignored) {
        }

        if (!addresses.isEmpty()) return addresses;
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces != null && interfaces.hasMoreElements()) {
                NetworkInterface networkInterface = interfaces.nextElement();
                if (!networkInterface.isUp() || networkInterface.isLoopback()) continue;
                String name = networkInterface.getName().toLowerCase(Locale.US);
                if (name.startsWith("tun") || name.startsWith("ppp")) continue;
                Enumeration<InetAddress> inetAddresses = networkInterface.getInetAddresses();
                while (inetAddresses.hasMoreElements()) {
                    InetAddress address = inetAddresses.nextElement();
                    if (isUsable(address)) addresses.add((Inet4Address) address);
                }
            }
        } catch (Throwable ignored) {
        }
        return addresses;
    }

    private static boolean isUsable(InetAddress address) {
        if (!(address instanceof Inet4Address)) return false;
        if (address.isLoopbackAddress() || address.isLinkLocalAddress()) return false;
        byte[] raw = address.getAddress();
        // 169.254.x.x is link-local and never routes to a printer.
        return !(raw[0] == (byte) 169 && raw[1] == (byte) 254);
    }

    private static JSONObject failure(String errorClass, String userMessage) {
        JSONObject result = new JSONObject();
        try {
            result.put("ok", false);
            result.put("hosts", new JSONArray());
            result.put("errorClass", errorClass);
            result.put("error", userMessage);
            result.put("userMessage", userMessage);
        } catch (Exception ignored) {
        }
        return result;
    }

    private static String ipString(int value) {
        return ((value >>> 24) & 0xFF) + "." + ((value >>> 16) & 0xFF) + "."
                + ((value >>> 8) & 0xFF) + "." + (value & 0xFF);
    }

    private static int toInt(String address) {
        try {
            String[] parts = address.split("\\.");
            return (Integer.parseInt(parts[0]) << 24) | (Integer.parseInt(parts[1]) << 16)
                    | (Integer.parseInt(parts[2]) << 8) | Integer.parseInt(parts[3]);
        } catch (Throwable ignored) {
            return 0;
        }
    }
}
