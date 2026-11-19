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
  var loop = document.getElementById("loop");
  var svg = document.getElementById("loop-svg");
  var path = document.getElementById("loop-path");
  var dot = document.getElementById("loop-dot");
  var halo = document.getElementById("loop-halo");
  if (!loop || !svg || !path || !dot) return;

  var pills = [].slice.call(loop.querySelectorAll(".loop-pill"));
  var faces = [].slice.call(loop.querySelectorAll(".loop-face"));
  var status = document.getElementById("loop-status");
  var notes = [
    "Chat. Your sessions with any agent.",
    "Wiki. It self-updates.",
    "You curate. Keep, fix, or archive."
  ];
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrowQuery = window.matchMedia("(max-width: 700px)");
  var duration = 9000;
  var elapsed = 0;
  var last = 0;
  var pointerHeld = false;
  var focusHeld = false;
  var stage = 0;

  function holding() { return pointerHeld || focusHeld; }

  function trackPath(narrow) {
    if (narrow) {
      svg.setAttribute("viewBox", "0 0 340 520");
      return "M 170 46 H 236 A 78 78 0 0 1 314 124 V 396 A 78 78 0 0 1 236 474 H 104 A 78 78 0 0 1 26 396 V 124 A 78 78 0 0 1 104 46 H 170 Z";
    }
    svg.setAttribute("viewBox", "0 0 640 360");
    return "M 320 44 H 508 A 68 68 0 0 1 576 112 V 248 A 68 68 0 0 1 508 316 H 132 A 68 68 0 0 1 64 248 V 112 A 68 68 0 0 1 132 44 H 320 Z";
  }

  function layout() {
    path.setAttribute("d", trackPath(narrowQuery.matches));
    var len = path.getTotalLength();
    var rect = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    pills.forEach(function (btn, i) {
      var p = path.getPointAtLength(len * (i / 3));
      btn.style.left = ((p.x - vb.x) / vb.width * rect.width) + "px";
      btn.style.top = ((p.y - vb.y) / vb.height * rect.height) + "px";
    });
  }

  function show(next, announce) {
    if (reduced) return;
    stage = next;
    pills.forEach(function (btn, i) {
      var on = i === next;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    faces.forEach(function (face, i) {
      face.classList.toggle("is-on", i === next);
    });
    if (announce && status) status.textContent = notes[next];
  }

  function render(t) {
    var len = path.getTotalLength();
    var p = path.getPointAtLength(len * t);
    dot.setAttribute("cx", p.x);
    dot.setAttribute("cy", p.y);
    halo.setAttribute("cx", p.x);
    halo.setAttribute("cy", p.y);
    var next = t < 1 / 3 ? 0 : t < 2 / 3 ? 1 : 2;
    if (next !== stage) show(next, false);
  }

  function frame(now) {
    if (!last) last = now;
    if (!holding()) elapsed += now - last;
    last = now;
    render((elapsed % duration) / duration);
    requestAnimationFrame(frame);
  }

  function jump(index) {
    elapsed = (index / 3) * duration;
    show(index, true);
    render(index / 3);
  }

  pills.forEach(function (btn) {
    btn.addEventListener("click", function () {
      jump(Number(btn.getAttribute("data-stage")));
    });
  });

  loop.addEventListener("mouseenter", function () { pointerHeld = true; });
  loop.addEventListener("mouseleave", function () { pointerHeld = false; });
  loop.addEventListener("focusin", function () { focusHeld = true; });
  loop.addEventListener("focusout", function (event) {
    if (!loop.contains(event.relatedTarget)) focusHeld = false;
  });

  layout();
  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);

  if (reduced) {
    faces.forEach(function (face) { face.classList.add("is-on"); });
    pills.forEach(function (btn) {
      btn.classList.remove("is-on");
      btn.setAttribute("aria-pressed", "false");
    });
    return;
  }

  show(0, false);
  requestAnimationFrame(frame);
})();

(function () {
  var root = document.getElementById("compare");
  if (!root) return;
  var tabs = [].slice.call(root.querySelectorAll("[role='tab']"));
  var panels = [].slice.call(root.querySelectorAll("[role='tabpanel']"));
  var status = document.getElementById("cmp-status");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var index = 0;
  var timer = 0;
  var pointerHeld = false;
  var focusHeld = false;

  function holding() { return pointerHeld || focusHeld; }

  function select(next, announce) {
    index = next;
    tabs.forEach(function (tab, i) {
      var on = i === next;
      tab.classList.toggle("is-on", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (panel, i) {
      var on = i === next;
      panel.classList.toggle("is-on", on);
      panel.hidden = !on;
    });
    if (announce && status) status.textContent = tabs[next].textContent.trim();
    if (announce) tabs[next].scrollIntoView({ inline: "nearest", block: "nearest" });
  }

  function tick() {
    if (!holding()) select((index + 1) % tabs.length, false);
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      select(i, true);
    });
    tab.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (i + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      select(next, true);
      tabs[next].focus();
    });
  });

  root.addEventListener("mouseenter", function () { pointerHeld = true; });
  root.addEventListener("mouseleave", function () { pointerHeld = false; });
  root.addEventListener("focusin", function () { focusHeld = true; });
  root.addEventListener("focusout", function (event) {
    if (!root.contains(event.relatedTarget)) focusHeld = false;
  });

  if (!reduced) timer = window.setInterval(tick, 7000);
})();
