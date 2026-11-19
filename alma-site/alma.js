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
  bindCopy(
    install,
    function () { return install.getAttribute("data-copy"); },
    document.getElementById("install-copy-status"),
    "Install prompt copied.",
    "Could not copy the install prompt."
  );
})();
