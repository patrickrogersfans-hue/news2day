
const API_URL = "/api/admin/articles";

const form = document.getElementById("article-form");
const statusBox = document.getElementById("admin-status");
const articlesList = document.getElementById("admin-articles");
const saveDraftButton = document.getElementById("save-draft");

let editingArticleId = null;

function showStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.style.color = isError ? "#ff5555" : "#38c878";
}

function getArticleData(published) {
  return {
    title: document.getElementById("article-title").value.trim(),
    summary: document.getElementById("article-summary").value.trim(),
    content: document.getElementById("article-content").value.trim(),
    category: document.getElementById("article-category").value,
    image: document.getElementById("article-image").value.trim(),
    author: document.getElementById("article-author").value.trim(),
    breaking: document.getElementById("article-breaking").checked,
    published: published
  };
}

function validateArticle(article) {
  if (!article.title || !article.summary || !article.content) {
    showStatus("Please complete the headline, summary and full article.", true);
    return false;
  }

  return true;
}

async function saveArticle(published) {
  const article = getArticleData(published);

  if (!validateArticle(article)) return;

  const method = editingArticleId ? "PUT" : "POST";

  if (editingArticleId) {
    article.id = editingArticleId;
  }

  try {
    showStatus("Saving article...");

    const response = await fetch(API_URL, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(article)
    });

    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? "The publishing API has not been installed yet."
          : "Unable to save. Check your admin login and backend."
      );
    }

    showStatus(
      published ? "Article published successfully." : "Draft saved successfully."
    );

    form.reset();
    editingArticleId = null;

    await loadAdminArticles();

  } catch (error) {
    showStatus(error.message, true);
  }
}

form.addEventListener("submit", function(event) {
  event.preventDefault();
  saveArticle(true);
});

saveDraftButton.addEventListener("click", function(event) {
  event.preventDefault();
  saveArticle(false);
});

async function loadAdminArticles() {
  try {
    const response = await fetch(API_URL, {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error("Admin API is not available yet.");
    }

    const articles = await response.json();

    articlesList.replaceChildren();

    if (!Array.isArray(articles) || articles.length === 0) {
      articlesList.textContent = "No articles found.";
      return;
    }

    articles.forEach(article => {
      const item = document.createElement("div");
      item.className = "admin-article";

      const heading = document.createElement("h3");
      heading.textContent = article.title || "Untitled article";

      const details = document.createElement("p");
      details.textContent =
        `${article.category || "Uncategorised"} · ` +
        (article.published ? "Published" : "Draft");

      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.type = "button";
      editButton.addEventListener("click", () => editArticle(article));

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.type = "button";
      deleteButton.addEventListener("click", () => deleteArticle(article.id));

      item.append(heading, details, editButton, deleteButton);
      articlesList.appendChild(item);
    });

  } catch (error) {
    articlesList.textContent =
      "Articles will appear here when the secure publishing API is installed.";
  }
}

function editArticle(article) {
  editingArticleId = article.id;

  document.getElementById("article-title").value = article.title || "";
  document.getElementById("article-summary").value = article.summary || "";
  document.getElementById("article-content").value = article.content || "";
  document.getElementById("article-category").value = article.category || "Irish News";
  document.getElementById("article-image").value = article.image || "";
  document.getElementById("article-author").value = article.author || "";
  document.getElementById("article-breaking").checked = !!article.breaking;
  document.getElementById("article-published").checked = !!article.published;

  showStatus("Editing article. Save your changes when ready.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteArticle(id) {
  if (!id) return;

  if (!confirm("Are you sure you want to delete this article?")) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        credentials: "same-origin"
      }
    );

    if (!response.ok) {
      throw new Error("Unable to delete article.");
    }

    showStatus("Article deleted.");
    await loadAdminArticles();

  } catch (error) {
    showStatus(error.message, true);
  }
}

loadAdminArticles();
