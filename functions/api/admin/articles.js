
function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare(`
      SELECT
        id, title, summary, content, category,
        image, author, breaking, published,
        published_at AS publishedAt,
        created_at AS createdAt
      FROM articles
      ORDER BY created_at DESC
    `).all();

    return json(result.results || []);

  } catch (error) {
    return json({ error: "Unable to load articles." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  return saveArticle(request, env, false);
}

export async function onRequestPut({ request, env }) {
  return saveArticle(request, env, true);
}

async function saveArticle(request, env, updating) {
  try {
    const data = await request.json();

    const title = String(data.title || "").trim();
    const summary = String(data.summary || "").trim();
    const content = String(data.content || "").trim();
    const category = String(data.category || "").trim();

    if (!title || !summary || !content || !category) {
      return json({ error: "Headline, summary, content and category are required." }, 400);
    }

    if (
      title.length > 250 ||
      summary.length > 1000 ||
      content.length > 100000 ||
      category.length > 80
    ) {
      return json({ error: "One or more fields are too long." }, 400);
    }

    const id = updating
      ? String(data.id || "")
      : crypto.randomUUID();

    if (!id || id.length > 100) {
      return json({ error: "A valid article ID is required." }, 400);
    }

    const published = data.published === true;
    const breaking = data.breaking === true;

    const existing = await env.DB.prepare(
      "SELECT published_at FROM articles WHERE id = ?"
    ).bind(id).first();

    if (updating && !existing) {
      return json({ error: "Article not found." }, 404);
    }

    const publishedAt = published
      ? (existing?.published_at || new Date().toISOString())
      : null;

    await env.DB.prepare(`
      INSERT INTO articles (
        id, title, summary, content, category,
        image, author, breaking, published,
        published_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        content = excluded.content,
        category = excluded.category,
        image = excluded.image,
        author = excluded.author,
        breaking = excluded.breaking,
        published = excluded.published,
        published_at = excluded.published_at,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      id,
      title,
      summary,
      content,
      category,
      String(data.image || "").trim(),
      String(data.author || "News2Day").trim(),
      breaking ? 1 : 0,
      published ? 1 : 0,
      publishedAt
    ).run();

    return json({
      success: true,
      id,
      message: published ? "Article published." : "Draft saved."
    }, updating ? 200 : 201);

  } catch (error) {
    return json({ error: "Unable to save article." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ error: "Article ID is required." }, 400);
    }

    const result = await env.DB.prepare(
      "DELETE FROM articles WHERE id = ?"
    ).bind(id).run();

    if (!result.meta.changes) {
      return json({ error: "Article not found." }, 404);
    }

    return json({
      success: true,
      message: "Article deleted."
    });

  } catch (error) {
    return json({ error: "Unable to delete article." }, 500);
  }
}
