
/* ==========================================
   NEWS2DAY - LIVE WEBSITE ENGINE
   Cloudflare D1 API CONNECTION
   ========================================== */

const API_URL = "/api/articles";
const REFRESH_INTERVAL = 60000;

let allArticles = [];
let tickerIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
    updateDate();

    loadNews();

    // Refresh news every 60 seconds
    setInterval(loadNews, REFRESH_INTERVAL);

    // Rotate live ticker
    setInterval(updateTicker, 10000);

    // Search, if search box exists
    const search = document.getElementById("search");

    if (search) {
        search.addEventListener("input", searchNews);
    }
});

function updateDate() {
    const date = document.getElementById("date");
    const year = document.getElementById("year");

    if (date) {
        date.textContent = new Date().toLocaleDateString("en-IE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Europe/Dublin"
        });
    }

    if (year) {
        year.textContent = new Date().getFullYear();
    }
}

// Retrieve published articles from Cloudflare
async function loadNews() {
    try {
        const response = await fetch(API_URL, {
            method: "GET",
            cache: "no-store",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("News API returned HTTP " + response.status);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid news API response");
        }

        allArticles = data.filter(article =>
            article &&
            article.id &&
            article.title &&
            (
                article.published === true ||
                article.published === 1 ||
                article.published === "1"
            )
        );

        allArticles.sort((a, b) =>
            new Date(b.publishedAt || 0) -
            new Date(a.publishedAt || 0)
        );

        displayNews();
        updateTicker();

        console.log("NEWS2DAY: Loaded", allArticles.length, "published articles.");

    } catch (error) {
        console.error("NEWS2DAY news loading error:", error);

        const container = document.getElementById("custom-articles-container");

        if (container && !allArticles.length) {
            container.textContent =
                "News feed temporarily unavailable. Please try again shortly.";
        }
    }
}

// Build article card safely
function createArticleCard(article) {
    const card = document.createElement("article");

    card.className =
        "news-card bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-xl hover:border-red-500/50 transition";

    card.dataset.category = String(article.category || "news").toLowerCase();

    const header = document.createElement("div");
    header.className =
        "flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400 mb-3";

    const category = document.createElement("span");
    category.className =
        "bg-red-600/20 text-red-400 font-bold px-3 py-1 rounded uppercase border border-red-500/30";
    category.textContent = article.category || "News";

    const date = document.createElement("span");
    const publishedDate = new Date(article.publishedAt);

    date.textContent = isNaN(publishedDate.getTime())
        ? "Recently published"
        : publishedDate.toLocaleString("en-IE", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Europe/Dublin"
        });

    header.append(category, date);

    card.appendChild(header);

    if (
        article.breaking === true ||
        article.breaking === 1 ||
        article.breaking === "1"
    ) {
        const breaking = document.createElement("span");
        breaking.className =
            "inline-block bg-red-600 text-white text-xs font-black px-3 py-1 rounded mb-3";
        breaking.textContent = "BREAKING NEWS";
        card.appendChild(breaking);
    }

    if (article.image) {
        const image = document.createElement("img");
        image.src = article.image;
        image.alt = article.title;
        image.loading = "lazy";
        image.className = "w-full max-h-80 object-cover rounded-xl mb-5";
        image.onerror = () => image.remove();
        card.appendChild(image);
    }

    const title = document.createElement("h2");
    title.className =
        "text-2xl font-black text-white mb-3 leading-snug hover:text-red-400 cursor-pointer";
    title.textContent = article.title;

    title.addEventListener("click", () => {
        openArticle(article.id);
    });

    card.appendChild(title);

    const summary = document.createElement("p");
    summary.className = "text-slate-300 text-sm mb-4 leading-relaxed";
    summary.textContent = article.summary || "";

    card.appendChild(summary);

    const footer = document.createElement("div");
    footer.className =
        "flex justify-between items-center flex-wrap gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400";

    const author = document.createElement("span");
    author.textContent = "By " + (article.author || "News2Day Newsdesk");

    const button = document.createElement("button");
    button.className =
        "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold transition";
    button.textContent = "READ FULL STORY →";

    button.addEventListener("click", () => {
        openArticle(article.id);
    });

    footer.append(author, button);
    card.appendChild(footer);

    return card;
}

// Render articles on homepage
function displayNews() {
    const container =
        document.getElementById("custom-articles-container");

    if (!container) {
        console.error("NEWS2DAY: Homepage article container missing.");
        return;
    }

    container.replaceChildren();

    if (!allArticles.length) {
        const message = document.createElement("p");
        message.className = "text-slate-400 py-6";
        message.textContent = "No published stories available yet.";
        container.appendChild(message);
        return;
    }

    allArticles.forEach(article => {
        container.appendChild(createArticleCard(article));
    });
}

// Open complete article in reader modal
async function openArticle(id) {
    try {
        const response = await fetch(
            API_URL + "?id=" + encodeURIComponent(id),
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error("Article could not be loaded.");
        }

        const article = await response.json();

        const modal = document.getElementById("article-modal");

        document.getElementById("modal-title").textContent =
            article.title || "";

        document.getElementById("modal-body").textContent =
            article.content || article.summary || "";

        document.getElementById("modal-tag").textContent =
            article.category || "News Dispatch";

        modal.classList.remove("hidden");

    } catch (error) {
        console.error(error);
        alert("Unable to open this article. Please try again.");
    }
}

function closeModal() {
    const modal = document.getElementById("article-modal");

    if (modal) {
        modal.classList.add("hidden");
    }
}

// Global functions for homepage buttons
window.openArticle = openArticle;
window.closeModal = closeModal;

// Retain compatibility with existing static story buttons
window.openModal = function(title, body) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").textContent = body;
    document.getElementById("modal-tag").textContent = "News Dispatch";
    document.getElementById("article-modal").classList.remove("hidden");
};

// Homepage navigation filtering
window.filterCategory = function(category) {
    document.querySelectorAll(".news-card").forEach(card => {
        const value = (card.dataset.category || "").toLowerCase();

        let show = category === "all";

        if (category === "dublin") {
            show = value.includes("dublin");
        } else if (category === "ireland") {
            show = value.includes("irish") || value.includes("ireland");
        } else if (category === "uk") {
            show = value.includes("uk") || value.includes("britain");
        } else if (category === "international") {
            show = value.includes("world") || value.includes("international");
        } else if (category === "politics") {
            show = value.includes("politic");
        } else if (category === "sport") {
            show = ["sport", "gaa", "soccer", "rugby"].some(v => value.includes(v));
        } else if (category === "war") {
            show = ["war", "conflict", "situation"].some(v => value.includes(v));
        }

        card.style.display = show ? "" : "none";
    });
};

// Live ticker uses actual published articles
function updateTicker() {
    const ticker = document.getElementById("breaking-ticker");

    if (!ticker || !allArticles.length) return;

    const breakingArticles = allArticles.filter(article =>
        article.breaking === true ||
        article.breaking === 1 ||
        article.breaking === "1"
    );

    const stories = breakingArticles.length
        ? breakingArticles
        : allArticles;

    tickerIndex = tickerIndex % stories.length;

    ticker.textContent =
        "• BREAKING / LATEST: " + stories[tickerIndex].title;

    tickerIndex++;
}

// Search published stories
function searchNews() {
    const input = document.getElementById("search");
    const results = document.getElementById("search-results");

    if (!input || !results) return;

    const query = input.value.trim().toLowerCase();

    results.replaceChildren();

    if (!query) return;

    allArticles
        .filter(article =>
            [
                article.title,
                article.summary,
                article.content,
                article.category
            ].join(" ").toLowerCase().includes(query)
        )
        .forEach(article => {
            results.appendChild(createArticleCard(article));
        });
}

window.searchNews = searchNews;

// Refresh when visitor returns to the page
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        loadNews();
    }
});

// Close reader with Escape key
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeModal();
    }
});
