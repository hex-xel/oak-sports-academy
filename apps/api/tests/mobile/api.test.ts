import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../../../mobile/node_modules/expo-constants/build/Constants.js", () => ({ default: { expoConfig: { extra: {} } } }));
vi.mock("expo-secure-store", () => ({}));
import { ApiClientError, createApiClient, resolveApiUrl } from "../../../mobile/lib/api.js";

afterEach(() => { vi.useRealTimers(); });
const baseUrl = () => "https://synthetic.example.test/api/v1";
describe("mobile JSON API transport", () => {
  it("uses an explicit LAN override in development and HTTPS config in release", () => {
    expect(resolveApiUrl("https://api.example.test/api/v1/", "http://192.168.1.5:3000/api/v1", true))
      .toBe("http://192.168.1.5:3000/api/v1");
    expect(resolveApiUrl("https://api.example.test/api/v1", "http://192.168.1.5:3000/api/v1", false))
      .toBe("https://api.example.test/api/v1");
    for (const invalid of [undefined, "$EXPO_PUBLIC_API_URL", "http://api.example.test/api/v1", "https://u:p@api.example.test/api/v1",
      "https://api.example.test/api/v1?token=x", "https://api.example.test/api/v1#x", "https://api.example.test"]) {
      expect(() => resolveApiUrl(invalid, undefined, false)).toThrow(ApiClientError);
    }
  });
  it("projects credential fields, identifies native login and never sends a saved bearer or cookies", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}'));
    const readToken = vi.fn().mockResolvedValue("saved-secret");
    const client = createApiClient({ baseUrl, fetch: transport, readToken });
    await client.login({ email: "synthetic@example.test", password: " secret ", role: "ADMIN" } as never);
    expect(readToken).not.toHaveBeenCalled();
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, init] = transport.mock.calls[0]!;
    expect(url).toBe(`${baseUrl()}/auth/login`);
    expect(init?.headers).toEqual({ Accept: "application/json", "Content-Type": "application/json", "X-Client-Platform": "mobile" });
    expect(init?.credentials).toBe("omit");
    expect(init?.redirect).toBe("error");
    expect(JSON.parse(String(init?.body))).toEqual({ email: "synthetic@example.test", password: " secret " });
  });
  it("injects bearer only into headers and accepts bodyless logout", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createApiClient({ baseUrl, fetch: transport, readToken: async () => "synthetic-token" });
    expect(await client.logout()).toBeUndefined();
    expect(transport.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer synthetic-token" });
    expect(transport.mock.calls[0]?.[0]).not.toContain("synthetic-token");
    await expect(client.request("//evil.example/steal", "GET")).rejects.toMatchObject({ code: "API_CONFIGURATION" });
    await expect(client.request("/auth/session?token=x", "GET")).rejects.toMatchObject({ code: "API_CONFIGURATION" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("preserves Retry-After and a known code but discards arbitrary server/native messages", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      '{"code":"RATE_LIMITED","message":"private secret","stack":"private"}', { status: 429, headers: { "Retry-After": "900" } }));
    const client = createApiClient({ baseUrl, fetch: transport, readToken: async () => "synthetic" });
    await expect(client.session()).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429, retryAfter: "900" });
    await expect(client.session()).rejects.not.toHaveProperty("message", "private secret");
    expect(transport).toHaveBeenCalledTimes(2); // Each explicit call makes exactly one attempt.
  });
  it("does not retry network failures or silently delete a token", async () => {
    const transport = vi.fn<typeof fetch>().mockRejectedValue(new Error("private network data"));
    const client = createApiClient({ baseUrl, fetch: transport, readToken: async () => "synthetic" });
    await expect(client.logout()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("bounds a hanging fetch, aborts it and allows a separate explicit retry", async () => {
    vi.useFakeTimers();
    const transport = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const client = createApiClient({ baseUrl, fetch: transport, timeoutMs: 1_000 });
    const result = expect(client.login({ email: "s@example.test", password: "x" })).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(1_000);
    await result;
    expect((transport.mock.calls[0]?.[1]?.signal as AbortSignal).aborted).toBe(true);
    transport.mockResolvedValue(new Response("{}"));
    await expect(client.login({ email: "s@example.test", password: "x" })).resolves.toEqual({});
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("bounds response body decoding too", async () => {
    vi.useFakeTimers();
    const transport = vi.fn<typeof fetch>().mockResolvedValue({ ok: true, status: 200,
      json: () => new Promise(() => {}), headers: new Headers() } as Response);
    const client = createApiClient({ baseUrl, fetch: transport, timeoutMs: 1_000 });
    const result = expect(client.login({ email: "s@example.test", password: "x" })).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(1_000);
    await result;
  });
  it("rejects malformed JSON success and fails closed without a stored token", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response("not json"));
    const client = createApiClient({ baseUrl, fetch: transport, readToken: async () => null });
    await expect(client.login({ email: "s@example.test", password: "x" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(client.session()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
