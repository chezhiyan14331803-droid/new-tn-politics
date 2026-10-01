/* =====================================================
   SEARCH
===================================================== */

function openSearch() {

    const popup =
        document.getElementById("searchPopup");

    const input =
        document.getElementById("searchInput");

    if (!popup) return;

    popup.style.display = "flex";

    /* Focus search box automatically */

    if (input) {
        setTimeout(() => {
            input.focus();
        }, 100);
    }
}


function closeSearch() {

    const popup =
        document.getElementById("searchPopup");

    if (!popup) return;

    popup.style.display = "none";
}


function searchNews() {

    const input =
        document.getElementById("searchInput");

    if (!input) return;

    const searchText =
        input.value.trim();


    if (!searchText) {

        input.focus();

        return;
    }


    window.location.href =
        `archive.html?search=${encodeURIComponent(searchText)}`;
}


/* =====================================================
   SEARCH USING ENTER KEY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const searchInput =
            document.getElementById("searchInput");


        if (searchInput) {

            searchInput.addEventListener(
                "keydown",
                event => {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        searchNews();

                    }

                }
            );

        }

    }
);


/* =====================================================
   CLOSE SEARCH WITH ESCAPE
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            closeSearch();

        }

    }
);


/* =====================================================
   SHARE NEWS
===================================================== */

function shareNews() {

    const shareData = {

        title: document.title,

        text:
            "Read this news from Daily News Updates.",

        url:
            window.location.href

    };


    if (navigator.share) {

        navigator.share(shareData)

            .catch(error => {

                console.log(
                    "Share cancelled:",
                    error
                );

            });

    }

    else if (navigator.clipboard) {

        navigator.clipboard

            .writeText(
                window.location.href
            )

            .then(() => {

                alert(
                    "News link copied."
                );

            });

    }

    else {

        alert(
            "Copy this page URL to share the news."
        );

    }

}


/* =====================================================
   DARK MODE
===================================================== */

function toggleDarkMode() {

    document.body.classList.toggle(
        "dark-mode"
    );


    const isDark =
        document.body.classList.contains(
            "dark-mode"
        );


    localStorage.setItem(
        "darkMode",
        isDark
            ? "enabled"
            : "disabled"
    );


    updateThemeButton();

}


function updateThemeButton() {

    const buttons =
        document.querySelectorAll(
            "#themeButton"
        );


    if (!buttons.length) return;


    const isDark =
        document.body.classList.contains(
            "dark-mode"
        );


    buttons.forEach(button => {

        button.textContent =
            isDark
                ? "☀️"
                : "🌙";

    });

}


/* =====================================================
   LOAD SAVED DARK MODE
===================================================== */

function loadDarkMode() {

    const savedTheme =
        localStorage.getItem(
            "darkMode"
        );


    if (savedTheme === "enabled") {

        document.body.classList.add(
            "dark-mode"
        );

    }


    updateThemeButton();

}


/* =====================================================
   START
===================================================== */

loadDarkMode();