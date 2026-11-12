package id.vianjaya.kasir.cabang1;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.ConnectException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.util.Locale;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Raw ESC/POS transport over TCP for 80 mm LAN printers such as the Comson USB & LAN model.
 *
 * <p>A print job opens a fresh socket to the printer's raw port (usually 9100), writes the bytes
 * in small chunks, flushes, and closes. Keeping no socket open between jobs avoids the stale
 * half-open connections that make a printer look "offline" after the tablet sleeps.
 */
public final class LanPrinter {
    public static final int DEFAULT_PORT = 9100;

    private static final String PREFS = "printer_diagnostics";
    private static final String KEY_HOST = "lan_host";
    private static final String KEY_PORT = "lan_port";
    private static final int CONNECT_TIMEOUT_MS = 5000;
    private static final int WRITE_TIMEOUT_MS = 8000;
    private static final int JOB_TIMEOUT_MS = 20000;
    private static final int WRITE_CHUNK_BYTES = 4096;
    private static final long WRITE_CHUNK_GAP_MS = 5L;
    private static final int MAX_ATTEMPTS = 2;
    private static final long RETRY_GAP_MS = 300L;
    private static final String NOT_READY_MESSAGE =
            "Printer LAN tidak merespons. Periksa kabel/WiFi, IP printer, dan pastikan printer menyala.";

    private final Context context;
    private final ExecutorService jobExecutor = Executors.newSingleThreadExecutor();
    private volatile String connectionState = "idle";
    private volatile String lastError = "";
    private volatile String host;
    private volatile int port = DEFAULT_PORT;
    private volatile int bytesSent;
    private volatile long lastConnectAt;
    private volatile String lastConnectResult = "none";

    public LanPrinter(Context context) {
        this.context = context.getApplicationContext();
        SharedPreferences prefs = prefs();
        this.host = prefs.getString(KEY_HOST, "");
        this.port = normalizePort(prefs.getInt(KEY_PORT, DEFAULT_PORT));
    }

    /** Escapes a host typed into the setup screen; accepts an IPv4 address or a plain hostname. */
    public static String normalizeHost(String value) {
        if (value == null) return "";
        String host = value.trim().replace(" ", "");
        if (host.isEmpty() || host.length() > 253) return "";
        if (host.contains("/") || host.contains(":") || host.contains("\\")) return "";
        if (host.startsWith("http://") || host.startsWith("https://")) return "";
        return host;
    }

    public static int normalizePort(int value) {
        if (value < 1 || value > 65535) return DEFAULT_PORT;
        return value;
    }

    public String connectionState() {
        return connectionState;
    }

    public long lastConnectAt() {
        return lastConnectAt;
    }

    public String host() {
        return host == null ? "" : host;
    }

    public int port() {
        return port;
    }

    /** Opens and closes a socket so the operator knows the printer is reachable before printing. */
    public JSONObject connect(String requestedHost, int requestedPort) {
        final String cleanHost = normalizeHost(requestedHost);
        final int cleanPort = normalizePort(requestedPort);
        if (cleanHost.isEmpty()) return failure("lan-invalid-host", "Alamat IP printer tidak valid", 0);
        host = cleanHost;
        port = cleanPort;
        connectionState = "connecting";
        Future<JSONObject> job = jobExecutor.submit(() -> probe(cleanHost, cleanPort));
        try {
            JSONObject result = job.get(JOB_TIMEOUT_MS, TimeUnit.MILLISECONDS);
            if (result.optBoolean("ok", false)) markConnected(cleanHost, cleanPort);
            return result;
        } catch (TimeoutException error) {
            job.cancel(true);
            connectionState = "error";
            return failure("lan-timeout", NOT_READY_MESSAGE, 0);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            connectionState = "error";
            return failure("lan-interrupted", "Koneksi printer terhenti", 0);
        } catch (ExecutionException error) {
            connectionState = "error";
            Throwable cause = error.getCause() == null ? error : error.getCause();
            return failure(classify(cause), message(cause), 0);
        }
    }

    public JSONObject print(byte[] data, String paperWidth) {
        final String targetHost = host;
        final int targetPort = port;
        if (targetHost == null || targetHost.isEmpty()) {
            return failure("lan-no-host", "IP printer LAN belum diatur", 0);
        }
        final String cleanHost = normalizeHost(targetHost);
        if (cleanHost.isEmpty()) return failure("lan-invalid-host", "Alamat IP printer tidak valid", 0);
        final int cleanPort = normalizePort(targetPort);
        connectionState = "connecting";
        Future<JSONObject> job = jobExecutor.submit(() -> send(cleanHost, cleanPort, data));
        try {
            JSONObject result = job.get(JOB_TIMEOUT_MS, TimeUnit.MILLISECONDS);
            if (result.optBoolean("ok", false)) markConnected(cleanHost, cleanPort);
            else connectionState = "error";
            return result;
        } catch (TimeoutException error) {
            job.cancel(true);
            connectionState = "error";
            return failure("lan-timeout", NOT_READY_MESSAGE, 0);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            connectionState = "error";
            return failure("lan-interrupted", "Proses cetak terhenti", 0);
        } catch (ExecutionException error) {
            connectionState = "error";
            Throwable cause = error.getCause() == null ? error : error.getCause();
            return failure(classify(cause), message(cause), 0);
        }
    }

    public void disconnect() {
        connectionState = "idle";
    }

    public void shutdown() {
        jobExecutor.shutdownNow();
    }

    public JSONObject snapshot() {
        JSONObject result = new JSONObject();
        try {
            result.put("connectionState", connectionState);
            result.put("lanHost", host == null ? "" : host);
            result.put("lanPort", port);
            result.put("lastConnectAt", lastConnectAt);
            result.put("connectResult", lastConnectResult);
            result.put("bytesSent", bytesSent);
        } catch (Exception ignored) {
        }
        return result;
    }

    private JSONObject probe(String targetHost, int targetPort) {
        Socket socket = null;
        try {
            socket = open(targetHost, targetPort);
            lastConnectResult = "tcp-probe";
            return success(0, 0);
        } catch (Throwable error) {
            return failure(classify(error), message(error), 0);
        } finally {
            closeQuietly(socket);
        }
    }

    private JSONObject send(String targetHost, int targetPort, byte[] data) {
        String errorClass = "lan-print-failed";
        String errorMessage = NOT_READY_MESSAGE;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            Socket socket = null;
            try {
                socket = open(targetHost, targetPort);
                lastConnectResult = "tcp";
                write(socket, data);
                bytesSent = data.length;
                return success(data.length, attempt);
            } catch (Throwable error) {
                errorClass = classify(error);
                errorMessage = message(error);
                closeQuietly(socket);
                if (attempt < MAX_ATTEMPTS) sleep(RETRY_GAP_MS);
            }
        }
        return failure(errorClass, errorMessage, MAX_ATTEMPTS);
    }

    private Socket open(String targetHost, int targetPort) throws Exception {
        Socket socket = new Socket();
        socket.setTcpNoDelay(true);
        socket.connect(new InetSocketAddress(targetHost, targetPort), CONNECT_TIMEOUT_MS);
        socket.setSoTimeout(WRITE_TIMEOUT_MS);
        return socket;
    }

    private void write(Socket socket, byte[] data) throws Exception {
        OutputStream output = socket.getOutputStream();
        for (int offset = 0; offset < data.length; offset += WRITE_CHUNK_BYTES) {
            int length = Math.min(WRITE_CHUNK_BYTES, data.length - offset);
            output.write(data, offset, length);
            output.flush();
            if (offset + length < data.length) sleep(WRITE_CHUNK_GAP_MS);
        }
        // Give the printer's buffer a moment to accept the tail before the socket closes.
        sleep(150L);
    }

    private void markConnected(String targetHost, int targetPort) {
        connectionState = "connected";
        lastError = "";
        lastConnectAt = System.currentTimeMillis();
        host = targetHost;
        port = targetPort;
        prefs().edit().putString(KEY_HOST, targetHost).putInt(KEY_PORT, targetPort).apply();
    }

    private SharedPreferences prefs() {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
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
            result.put("connectResult", lastConnectResult);
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
            result.put("connectResult", lastConnectResult);
            return result;
        } catch (Exception ignored) {
            return new JSONObject();
        }
    }

    private String classify(Throwable error) {
        if (error instanceof UnknownHostException) return "lan-host-unknown";
        if (error instanceof SocketTimeoutException) return "lan-timeout";
        if (error instanceof ConnectException) return "lan-connect-failed";
        String name = error.getClass().getName().toLowerCase(Locale.US);
        if (name.contains("timeout")) return "lan-timeout";
        if (name.contains("connect")) return "lan-connect-failed";
        return "lan-print-failed";
    }

    private String message(Throwable error) {
        if (error == null) return NOT_READY_MESSAGE;
        if (error instanceof UnknownHostException) {
            return "IP printer LAN tidak ditemukan. Periksa alamat IP lalu coba lagi.";
        }
        if (error instanceof SocketTimeoutException) return NOT_READY_MESSAGE;
        if (error instanceof ConnectException) return NOT_READY_MESSAGE;
        String raw = error.getMessage();
        return raw == null || raw.isEmpty() ? NOT_READY_MESSAGE : raw;
    }

    private void closeQuietly(Socket socket) {
        if (socket == null) return;
        try {
            socket.close();
        } catch (Exception ignored) {
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
