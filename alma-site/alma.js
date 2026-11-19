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
