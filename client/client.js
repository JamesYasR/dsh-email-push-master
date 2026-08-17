// dsh-email-push-master client: a "邮件推送" settings card under
// Settings → Plugins → configurable. The card shows a compact summary;
// clicking it opens a Modal with the full SMTP config form, backed by the
// /dsh-email-push/* host routes.
window.__ModuleLoader__.load({ id: "dsh-email-push-master", factory: (require) => {
  var module = { exports: {} };
  var exports = module.exports;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  var React = require("react");
  var primitives = require("@deepseek-ai/dsh-client-ui-primitives");
  var h = React.createElement;
  var Modal = (primitives && primitives.Modal) || null;

  var MASKED = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

  var PROVIDERS = [
    { id: "163", label: "163 邮箱", host: "smtp.163.com" },
    { id: "qq", label: "QQ 邮箱", host: "smtp.qq.com" },
    { id: "custom", label: "自定义", host: "" },
  ];

  function providerOf(host) {
    var s = String(host || "").toLowerCase();
    if (s.indexOf("163") >= 0) return "163";
    if (s.indexOf("qq") >= 0) return "qq";
    return "custom";
  }

  var formStyles = {
    root: { display: "flex", flexDirection: "column", gap: "12px", padding: "4px 0" },
    field: { display: "flex", flexDirection: "column", gap: "6px" },
    label: { fontSize: "12px", opacity: 0.75, fontWeight: 500 },
    input: {
      boxSizing: "border-box", width: "100%", padding: "8px 10px",
      borderRadius: "6px", border: "1px solid rgba(128,128,128,0.35)",
      background: "transparent", color: "inherit", fontSize: "13px",
    },
    actions: { display: "flex", gap: "8px", marginTop: "4px" },
    btn: {
      padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer",
      fontSize: "13px", fontWeight: 500, color: "#fff", background: "#3b82f6",
    },
    btnGhost: { background: "transparent", color: "inherit", border: "1px solid rgba(128,128,128,0.4)" },
    status: { fontSize: "12px", opacity: 0.85, whiteSpace: "pre-wrap" },
    loading: { fontSize: "13px", opacity: 0.7 },
  };

  var cardStyles = {
    root: { listStyle: "none", margin: 0, padding: 0 },
    head: {
      display: "flex", alignItems: "center", gap: "12px", width: "100%",
      padding: "10px 12px", background: "transparent", border: "none",
      cursor: "pointer", color: "inherit", textAlign: "left", fontSize: "13px",
    },
    headText: { display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 },
    name: { fontWeight: 600, fontSize: "13px" },
    desc: { fontSize: "12px", opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    gear: { fontSize: "12px", opacity: 0.7, flexShrink: 0 },
  };

  function Field(props) {
    return h("div", { style: formStyles.field }, h("label", { style: formStyles.label }, props.label), props.children);
  }

  // The full config form, rendered inside the Modal. `onSaved(newConfig)`
  // lets the card refresh its summary after a successful save.
  function EmailPushSection(props) {
    var cfgState = React.useState(null); var cfg = cfgState[0]; var setCfg = cfgState[1];
    var providerState = React.useState("custom"); var provider = providerState[0]; var setProvider = providerState[1];
    var statusState = React.useState(""); var status = statusState[0]; var setStatus = statusState[1];
    var busyState = React.useState(false); var busy = busyState[0]; var setBusy = busyState[1];

    React.useEffect(function () {
      fetch("/dsh-email-push/config")
        .then(function (r) { return r.json(); })
        .then(function (b) {
          var c = (b && b.config) || {};
          setCfg(c);
          setProvider(providerOf(c.smtpHost));
        })
        .catch(function () { setStatus("加载配置失败"); });
    }, []);

    function setField(key) {
      return function (e) {
        setCfg(function (prev) {
          var next = {};
          for (var k in prev) next[k] = prev[k];
          next[key] = e.target.value;
          return next;
        });
      };
    }

    function pickProvider(p) {
      setProvider(p.id);
      if (p.id !== "custom") {
        setCfg(function (prev) {
          var next = {};
          for (var k in prev) next[k] = prev[k];
          next.smtpHost = p.host;
          next.smtpPort = 465;
          next.useSsl = true;
          return next;
        });
      }
    }

    function save() {
      setBusy(true);
      setStatus("保存中…");
      fetch("/dsh-email-push/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cfg),
      })
        .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
        .then(function (x) {
          if (x.ok && x.b.ok) {
            setStatus("已保存");
            setCfg(x.b.config || cfg);
            if (typeof props.onSaved === "function") props.onSaved(x.b.config || cfg);
          } else {
            setStatus((x.b && x.b.error) || "保存失败");
          }
        })
        .catch(function () { setStatus("保存失败"); })
        .finally(function () { setBusy(false); });
    }

    function test() {
      setBusy(true);
      setStatus("测试中…");
      fetch("/dsh-email-push/test", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
        .then(function (r) { return r.json(); })
        .then(function (b) { setStatus(b && b.ok ? "验证通过（" + b.method + "）" : (b && b.error) || "验证失败"); })
        .catch(function () { setStatus("测试失败"); })
        .finally(function () { setBusy(false); });
    }

    if (!cfg) return h("div", { style: formStyles.loading }, "加载中…");

    return h("div", { style: formStyles.root },
      h(Field, { label: "服务商" },
        h("select", {
          value: provider,
          style: formStyles.input,
          onChange: function (e) {
            var id = e.target.value;
            for (var i = 0; i < PROVIDERS.length; i++) if (PROVIDERS[i].id === id) { pickProvider(PROVIDERS[i]); break; }
          },
        }, PROVIDERS.map(function (p) { return h("option", { key: p.id, value: p.id }, p.label); }))),
      h(Field, { label: "发送服务器地址" },
        h("input", { value: cfg.smtpHost || "", onChange: setField("smtpHost"), placeholder: "smtp.163.com", style: formStyles.input })),
      h(Field, { label: "发件邮箱" },
        h("input", { value: cfg.from || "", onChange: setField("from"), placeholder: "you@163.com", style: formStyles.input })),
      h(Field, { label: "密钥（SMTP 授权码）" },
        h("input", { type: "password", value: cfg.authCode || "", onChange: setField("authCode"), placeholder: cfg.hasAuthCode ? "已设置，留空则不变" : "16 位授权码", style: formStyles.input })),
      h(Field, { label: "收件邮箱" },
        h("input", { value: cfg.to || "", onChange: setField("to"), placeholder: "recipient@example.com", style: formStyles.input })),
      h("div", { style: formStyles.actions },
        h("button", { onClick: save, disabled: busy, style: formStyles.btn }, "保存"),
        h("button", { onClick: test, disabled: busy, style: Object.assign({}, formStyles.btn, formStyles.btnGhost) }, "测试发送")),
      status ? h("div", { style: formStyles.status }, status) : null);
  }

  // Compact list card: title + summary; click opens the config Modal.
  function EmailPushCard() {
    var openState = React.useState(false); var open = openState[0]; var setOpen = openState[1];
    var summaryState = React.useState("加载中…"); var summary = summaryState[0]; var setSummary = summaryState[1];

    function refreshSummary() {
      fetch("/dsh-email-push/config")
        .then(function (r) { return r.json(); })
        .then(function (b) {
          var c = (b && b.config) || {};
          if (c.from && c.to) setSummary(c.from + " → " + c.to);
          else if (c.from) setSummary(c.from);
          else setSummary("未配置");
        })
        .catch(function () { setSummary("加载失败"); });
    }

    React.useEffect(function () { refreshSummary(); }, []);

    return h("li", { style: cardStyles.root },
      h("button", { type: "button", style: cardStyles.head, onClick: function () { setOpen(true); } },
        h("div", { style: cardStyles.headText },
          h("div", { style: cardStyles.name }, "邮件推送"),
          h("div", { style: cardStyles.desc }, summary)),
        h("span", { style: cardStyles.gear }, "⚙ 配置")),
      open && Modal
        ? h(Modal, {
            open: true,
            onClose: function () { setOpen(false); },
            title: "邮件推送配置",
            children: h(EmailPushSection, {
              onSaved: function (c) {
                if (c && c.from && c.to) setSummary(c.from + " → " + c.to);
                else setSummary("未配置");
              },
            }),
          })
        : null);
  }

  exports.name = "dsh-email-push-master";
  exports.inject = ["slots"];
  exports.apply = function (ctx) {
    ctx.slots.inject("settings.plugin.item", function* () {
      yield ctx.slots.register({
        name: "settings.plugin.item",
        id: "dsh-email-push",
        order: 50,
        label: function () { return "邮件推送"; },
      }, function () { return h(EmailPushCard); });
    });
  };
  return module.exports;
}});
