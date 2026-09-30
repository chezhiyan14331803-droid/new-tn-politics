function openSearch() {
  document.getElementById("searchPopup").style.display = "flex";
}

function closeSearch() {
  document.getElementById("searchPopup").style.display = "none";
}

function searchNews() {
  const searchText =
    document.getElementById("searchInput").value.trim();

  if (!searchText) {
    alert("Please enter something to search.");
    return;
  }

  window.location.href =
    `archive.html?search=${encodeURIComponent(searchText)}`;
}

function shareNews() {

  const shareData = {
    title: document.title,
    text: "Read this news from New TN Politics.",
    url: window.location.href
  };

  if (navigator.share) {

    navigator.share(shareData)
      .catch(error => {
        console.log(
          "Share cancelled:",
          error
        );
      });

  } else if (navigator.clipboard) {

    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        alert("News link copied.");
      });

  } else {

    alert(
      "Copy this page URL to share the news."
    );
  }
}
/* =====================================================
   DARK MODE
===================================================== */

function toggleDarkMode() {

    document.body.classList.toggle("dark-mode");

    const isDark =
        document.body.classList.contains("dark-mode");

    localStorage.setItem(
        "darkMode",
        isDark ? "enabled" : "disabled"
    );

    updateThemeButton();
}


function updateThemeButton() {

    const button =
        document.getElementById("themeButton");

    if (!button) return;

    const isDark =
        document.body.classList.contains("dark-mode");

    button.textContent =
        isDark ? "☀️" : "🌙";
}


/* Load saved theme */

function loadDarkMode() {

    const savedTheme =
        localStorage.getItem("darkMode");

    if (savedTheme === "enabled") {

        document.body.classList.add(
            "dark-mode"
        );
    }

    updateThemeButton();
}


loadDarkMode();