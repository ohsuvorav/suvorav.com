(function () {
  function bindCopy(button, getText, status, okMessage, failMessage) {
    if (!button) return;

    function finish(ok) {
      button.textContent = ok ? "Copied" : "Copy failed";
      if (status) status.textContent = ok ? okMessage : failMessage;
      window.setTimeout(function () {
        button.textContent = "Copy";
        if (status) status.textContent = "";
      }, 2000);
    }

    function fallback(text) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(area);
      finish(ok);
    }

    button.addEventListener("click", function () {
      var text = getText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          finish(true);
        }, function () {
          fallback(text);
        });
        return;
      }
      fallback(text);
    });
  }

  var quickstart = document.getElementById("quickstart-code");
  bindCopy(
    document.getElementById("copy-quickstart"),
    function () {
      return quickstart.textContent
        .split("\n")
        .map(function (line) { return line.trim(); })
        .filter(Boolean)
        .join("\n");
    },
    document.getElementById("copy-status"),
    "Quickstart copied.",
    "Could not copy the quickstart."
  );

  var install = document.getElementById("copy-install");
  if (!install) return;

  var idle = install.querySelector(".label-idle");
  var done = install.querySelector(".label-done");
  var installStatus = document.getElementById("install-copy-status");
  var installTimer = null;

  function setCopied(on) {
    install.classList.toggle("is-copied", on);
    if (idle) idle.setAttribute("aria-hidden", on ? "true" : "false");
    if (done) done.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function finishInstall(ok) {
    if (installTimer) window.clearTimeout(installTimer);
    if (ok) {
      setCopied(true);
      if (idle) idle.textContent = "Copy prompt";
      if (installStatus) installStatus.textContent = "Copied.";
    } else {
      setCopied(false);
      if (idle) idle.textContent = "Copy failed";
      if (installStatus) installStatus.textContent = "Could not copy the prompt.";
    }
    installTimer = window.setTimeout(function () {
      setCopied(false);
      if (idle) idle.textContent = "Copy prompt";
      if (installStatus) installStatus.textContent = "";
    }, 2000);
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(area);
    finishInstall(ok);
  }

  install.addEventListener("click", function () {
    var text = install.getAttribute("data-copy");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        finishInstall(true);
      }, function () {
        fallbackCopy(text);
      });
      return;
    }
    fallbackCopy(text);
  });
})();

(function () {
  var root = document.getElementById("why-op");
  if (!root) return;
  var items = [].slice.call(root.querySelectorAll(".op-item"));
  var tabs = items.map(function (item) { return item.querySelector(".op-tab"); });
  var status = document.getElementById("why-status");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var index = 0;

  function select(next, announce) {
    index = next;
    items.forEach(function (item, i) {
      var on = i === next;
      item.classList.toggle("is-on", on);
      var tab = tabs[i];
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      tab.querySelector(".op-bar").classList.remove("is-run");
    });
    if (announce && status) {
      status.textContent = tabs[next].querySelector(".op-title").textContent;
    }
    if (reduced) return;
    var bar = tabs[next].querySelector(".op-bar");
    void bar.offsetWidth;
    bar.classList.add("is-run");
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { select(i, true); });
    tab.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (i + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      select(next, true);
      tabs[next].focus();
    });
    tab.querySelector(".op-bar").addEventListener("animationend", function (event) {
      if (event.animationName !== "op-fill") return;
      if (tabs.indexOf(tab) !== index) return;
      select((index + 1) % tabs.length, false);
    });
  });

  select(0, false);
})();
