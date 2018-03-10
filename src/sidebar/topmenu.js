const LONG_PRESS_DELAY = 500;

function TopMenu({onSearchChange}) {
  this._newTabButtonView = document.getElementById("newtab");
  this._settingsView = document.getElementById("settings");
  this._searchBoxInput = document.getElementById("searchbox-input");
  this._newTabMenu = document.getElementById("newtab-menu");
  this._newTabLabelView = document.getElementById("newtab-label");
  this._setupLabels();
  this._setupListeners();

  this._onSearchChange = onSearchChange;
}

TopMenu.prototype = {
  updateSearch(val) {
    this._searchBoxInput.value = val;
  },
  _setupListeners() {
    this._settingsView.addEventListener("click", () => {
      browser.runtime.openOptionsPage();
    });

    const searchbox = document.getElementById("searchbox");
    this._searchBoxInput.addEventListener("input", (e) => {
      this._onSearchChange(e.target.value);
    });
    this._searchBoxInput.addEventListener("focus", () => {
      searchbox.classList.add("focused");
      this._newTabLabelView.classList.add("hidden");
    });
    this._searchBoxInput.addEventListener("blur", () => {
      searchbox.classList.remove("focused");
      this._newTabLabelView.classList.remove("hidden");
    });

    this._newTabButtonView.addEventListener("click", () => {
      if (!this._newTabMenuShown) {
        browser.tabs.create({});
      }
    });
    this._newTabButtonView.addEventListener("auxclick", e => {
      if (e.which === 2) {
        this._createTabAfterCurrent();
      } else if (e.which === 3) {
        this._showNewTabMenu();
      }
    });
    this._newTabButtonView.addEventListener("mousedown", () => {
      this._longPressTimer = setTimeout(() => {
        this._showNewTabMenu();
      }, LONG_PRESS_DELAY);
    });
    this._newTabButtonView.addEventListener("mouseup", () => {
      clearTimeout(this._longPressTimer);
    });

    window.addEventListener("keyup", (e) => {
      if (e.keyCode === 27) { // Clear search on ESC key pressed
        this._onSearchChange("");
      }
    });
    window.addEventListener("mousedown", (e) => {
      if (!e.target.classList.contains("newtab-menu-identity")) {
        this._hideNewTabMenu();
      }
    });
    window.addEventListener("blur", () => {
      this._hideNewTabMenu();
    });
  },
  _setupLabels() {
    this._newTabLabelView.textContent = browser.i18n.getMessage("newTabBtnLabel");
    this._newTabLabelView.title = browser.i18n.getMessage("newTabBtnTooltip");
    this._settingsView.title = browser.i18n.getMessage("settingsBtnTooltip");
    this._searchBoxInput.placeholder = browser.i18n.getMessage("searchPlaceholder");
  },
  async _createTabAfterCurrent(cookieStoreId = null) {
    let currentIndex = (await browser.tabs.query({active: true}))[0].index;
    let props = {index: currentIndex + 1};
    if (cookieStoreId) {
      props.cookieStoreId = cookieStoreId;
    }
    browser.tabs.create(props);
  },
  async _showNewTabMenu() {
    if (!browser.contextualIdentities) {
      return;
    }
    this._newTabMenuShown = true;
    // Create the identities
    const identities = await browser.contextualIdentities.query({});
    if (!identities) {
      return;
    }
    const fragment = document.createDocumentFragment();
    for (let identity of identities) {
      const identityItem = document.createElement("div");
      identityItem.className = "newtab-menu-identity";
      identityItem.addEventListener("mouseup", e => {
        if (e.which !== 1) {
          return;
        }
        this._hideNewTabMenu();
        browser.tabs.create({cookieStoreId: identity.cookieStoreId});
      });
      identityItem.addEventListener("auxclick", e => {
        if (e.which === 2) {
          this._hideNewTabMenu();
          this._createTabAfterCurrent(identity.cookieStoreId);
        }
      });
      const identityIcon = document.createElement("div");
      identityIcon.classList.add("newtab-menu-identity-icon");
      identityIcon.setAttribute("data-identity-color", identity.color);
      identityIcon.setAttribute("data-identity-icon", identity.icon);
      identityItem.appendChild(identityIcon);
      const identityLabel = document.createElement("div");
      identityLabel.className = "newtab-menu-identity-label";
      identityLabel.textContent = identity.name;
      identityItem.appendChild(identityLabel);
      fragment.appendChild(identityItem);
    }

    // Append the identities and show the menu
    this._newTabMenu.appendChild(fragment);
    this._newTabMenu.classList.remove("hidden");

    this._newTabButtonView.classList.add("menuopened");
  },
  _hideNewTabMenu() {
    this._newTabMenuShown = false;
    this._newTabMenu.classList.add("hidden");
    this._newTabButtonView.classList.remove("menuopened");

    // Clear the menu
    while (this._newTabMenu.firstChild) {
      this._newTabMenu.removeChild(this._newTabMenu.firstChild);
    }
  }
}

module.exports = TopMenu;
