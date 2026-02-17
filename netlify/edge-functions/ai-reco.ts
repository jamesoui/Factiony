export default async (request: Request) => {
  return new Response(
    JSON.stringify({
      ok: true,
      method: request.method,
      url: request.url,
    }),
    {
      headers: { "content-type": "application/json" },
      status: 200,
    }
  );
};
