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
  if (navigator.share) {
    navigator.share({
      title: document.title,
      text: "Read news from New TN Politics.",
      url: window.location.href
    });
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert("News link copied.");
  }
}