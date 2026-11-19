(function () {
  var button = document.getElementById("copy-quickstart");
  var code = document.getElementById("quickstart-code");
  var status = document.getElementById("copy-status");
  if (!button || !code) return;

  function textToCopy() {
    return code.textContent
      .split("\n")
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .join("\n");
  }

  function finish(ok) {
    button.textContent = ok ? "Copied" : "Copy failed";
    if (status) {
      status.textContent = ok
        ? "Quickstart copied."
        : "Could not copy the quickstart.";
    }
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
    var text = textToCopy();
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
})();
