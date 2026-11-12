
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return Response.json(
        { error: "Database binding DB is missing." },
        { status: 500 }
      );
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Dublin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
      const result = await env.DB.prepare(`
        SELECT
          id, title, summary, content, category,
          image, author, breaking, published,
          published_at AS publishedAt
        FROM articles
        WHERE id = ?
          AND published = 1
          AND date(published_at) >= date(?)
        LIMIT 1
      `).bind(id, today).first();

      if (!result) {
        return Response.json(
          { error: "Article not found." },
          { status: 404 }
        );
      }

      return Response.json(result);
    }

    const results = await env.DB.prepare(`
      SELECT
        id, title, summary, content, category,
        image, author, breaking, published,
        published_at AS publishedAt
      FROM articles
      WHERE published = 1
        AND date(published_at) >= date(?)
      ORDER BY
        breaking DESC,
        published_at DESC
    `).bind(today).all();

    return Response.json(results.results || []);

  } catch (error) {
    return Response.json(
      { error: "Unable to retrieve news articles." },
      { status: 500 }
    );
  }
}
