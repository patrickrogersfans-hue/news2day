
/* ==================================
   NEWS2DAY WEBSITE ENGINE
   ================================== */

const API_URL = "/api/articles";
const REFRESH_INTERVAL = 60000;

let allArticles = [];

// Current date and year
document.addEventListener("DOMContentLoaded", () => {
  const dateElement = document.getElementById("date");
  const yearElement = document.getElementById("year");

  if (dateElement) {
    dateElement.textContent = new Date().toLocaleDateString("en-IE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  loadNews();

  setInterval(loadNews, REFRESH_INTERVAL);

  const searchInput = document.getElementById("search");

  if (searchInput) {
    searchInput.addEventListener("input", searchNews);
  }
});

// Only display stories published today or later
function isCurrentStory(article) {
  const date = new Date(article.publishedAt);

  if (!article.publishedAt || isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date >= today &&
    article.published !== false;
}

// Load articles from Cloudflare API
async function loadNews() {
  try {
    const response = await fetch(API_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("News API unavailable");
    }

    const data = await response.json();

    allArticles = Array.isArray(data)
      ? data
      : (data.articles || []);

    allArticles = allArticles.filter(isCurrentStory);

    allArticles.sort((a, b) =>
      new Date(b.publishedAt) -
      new Date(a.publishedAt)
    );

    displayNews();

  } catch (error) {
    console.warn("News API unavailable:", error);

    // Local published articles are a temporary fallback.
    const localArticles = window.NEWS2DAY_ARTICLES || [];

    allArticles = localArticles
      .filter(isCurrentStory)
      .sort((a, b) =>
        new Date(b.publishedAt) -
        new Date(a.publishedAt)
      );

    displayNews();
  }
}

// Create an article card safely
function createArticleCard(article) {
  const card = document.createElement("article");
  card.className = "news-card";

  if (article.image) {
    const image = document.createElement("img");
    image.src = article.image;
    image.alt = article.title || "News photograph";
    image.loading = "lazy";
    image.onerror = () => image.remove();
    card.appendChild(image);
  }

  const content = document.createElement("div");
  content.className = "news-card-content";

  const category = document.createElement("span");
  category.className = "category";
  category.textContent = article.category || "News";

  const title = document.createElement("h3");
  title.textContent = article.title || "Untitled story";

  const summary = document.createElement("p");
  summary.textContent = article.summary || "";

  const meta = document.createElement("div");
  meta.className = "news-meta";

  const date = new Date(article.publishedAt);

  meta.textContent = isNaN(date.getTime())
    ? "News2Day"
    : date.toLocaleString("en-IE", {
        dateStyle: "medium",
        timeStyle: "short"
      });

  const link = document.createElement("a");
  link.className = "read-more";
  link.textContent = "READ FULL STORY →";

  const articleId = article.id || "";

  link.href = articleId
    ? "article.html?id=" + encodeURIComponent(articleId)
    : "#";

  content.append(category, title, summary, meta, link);
  card.appendChild(content);

  return card;
}

// Display stories in a section
function renderSection(elementId, articles, emptyText) {
  const container = document.getElementById(elementId);

  if (!container) return;

  container.replaceChildren();

  if (!articles.length) {
    const message = document.createElement("div");
    message.className = "empty-message";
    message.textContent = emptyText || "No published stories yet.";
    container.appendChild(message);
    return;
  }

  articles.forEach(article => {
    container.appendChild(createArticleCard(article));
  });
}

// Display all news sections
function displayNews() {

  const breaking = allArticles.filter(
    article => article.breaking === true
  );

  const latest = allArticles.slice(0, 12);

  renderSection(
    "breaking-news",
    breaking.slice(0, 6),
    "No breaking news at present."
  );

  renderSection(
    "latest-news",
    latest,
    "No latest stories published yet."
  );

  renderSection(
    "irish-news",
    allArticles.filter(a =>
      ["Irish News", "Ireland", "Dublin News"].includes(a.category)
    ),
    "No Irish news stories published yet."
  );

  renderSection(
    "political-news",
    allArticles.filter(a =>
      ["Politics", "Political Hub"].includes(a.category)
    ),
    "No political stories published yet."
  );

  renderSection(
    "situation-news",
    allArticles.filter(a =>
      ["Situation Room", "World News", "War & Conflict"].includes(a.category)
    ),
    "No situation room stories published yet."
  );

  renderSection(
    "gaa-news",
    allArticles.filter(a => a.category === "GAA"),
    "No GAA stories published yet."
  );

  renderSection(
    "soccer-news",
    allArticles.filter(a => a.category === "Soccer"),
    "No soccer stories published yet."
  );
}

// Search all published stories
function searchNews() {
  const input = document.getElementById("search");
  const query = input ? input.value.trim().toLowerCase() : "";

  const results = allArticles.filter(article => {
    const searchableText = [
      article.title,
      article.summary,
      article.content,
      article.category
    ].join(" ").toLowerCase();

    return searchableText.includes(query);
  });

  renderSection(
    "search-results",
    query ? results : [],
    "Enter a search term to find stories."
  );
}

// Make searchNews available to the search button
window.searchNews = searchNews;

// Update news when the visitor returns to the page
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    loadNews();
  }
});
