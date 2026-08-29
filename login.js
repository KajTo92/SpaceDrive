const loginTabs = document.querySelectorAll("[data-login-tab]");
const loginForms = document.querySelectorAll("[data-login-form]");
const loginMessage = document.querySelector("[data-login-message]");

loginTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const accountType = tab.dataset.loginTab;

    loginTabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });

    loginForms.forEach((form) => {
      form.hidden = form.dataset.loginForm !== accountType;
    });

    loginMessage.textContent = "";
  });
});

loginForms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (form.dataset.loginForm === "passenger") {
      localStorage.setItem("spacedrive-demo-role", "passenger");
      window.location.href = "passenger/";
      return;
    }
    localStorage.setItem("spacedrive-demo-role", "driver");
    window.location.href = "driver/";
  });
});

document.querySelector("[data-login-provider]")?.addEventListener("click", () => {
  localStorage.setItem("spacedrive-demo-role", "passenger");
  window.location.href = "passenger/";
});
