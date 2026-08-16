// dsh-email-push-master client: a "邮件推送" settings section to configure
// the SMTP server / provider / sender / auth code / recipient, backed by the
// /dsh-email-push/* host routes (same file lives next to config.json).
window.__ModuleLoader__.load({ id: "dsh-email-push-master", factory: (require) => {
  var module = { exports: {} };
  var exports = module.exports;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  var React = require("react");
  var h = React.createElement;

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

  var styles = {
    root: { padding: "4px 0", display: "flex", flexDirection: "column", gap: "12px" },
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

  function Field(props) {
    return h("div", { style: styles.field }, h("label", { style: styles.label }, props.label), props.children);
  }

  function EmailPushSection() {
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
          if (x.ok && x.b.ok) { setStatus("已保存"); setCfg(x.b.config || cfg); }
          else setStatus((x.b && x.b.error) || "保存失败");
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

    if (!cfg) return h("div", { style: styles.loading }, "加载中…");

    return h("div", { style: styles.root },
      h(Field, { label: "服务商" },
        h("select", {
          value: provider,
          style: styles.input,
          onChange: function (e) {
            var id = e.target.value;
            for (var i = 0; i < PROVIDERS.length; i++) if (PROVIDERS[i].id === id) { pickProvider(PROVIDERS[i]); break; }
          },
        }, PROVIDERS.map(function (p) { return h("option", { key: p.id, value: p.id }, p.label); }))),
      h(Field, { label: "发送服务器地址" },
        h("input", { value: cfg.smtpHost || "", onChange: setField("smtpHost"), placeholder: "smtp.163.com", style: styles.input })),
      h(Field, { label: "发件邮箱" },
        h("input", { value: cfg.from || "", onChange: setField("from"), placeholder: "you@163.com", style: styles.input })),
      h(Field, { label: "密钥（SMTP 授权码）" },
        h("input", { type: "password", value: cfg.authCode || "", onChange: setField("authCode"), placeholder: cfg.hasAuthCode ? "已设置，留空则不变" : "16 位授权码", style: styles.input })),
      h(Field, { label: "收件邮箱" },
        h("input", { value: cfg.to || "", onChange: setField("to"), placeholder: "recipient@example.com", style: styles.input })),
      h("div", { style: styles.actions },
        h("button", { onClick: save, disabled: busy, style: styles.btn }, "保存"),
        h("button", { onClick: test, disabled: busy, style: Object.assign({}, styles.btn, styles.btnGhost) }, "测试发送")),
      status ? h("div", { style: styles.status }, status) : null);
  }

  exports.name = "dsh-email-push-master";
  exports.inject = ["slots"];
  exports.apply = function (ctx) {
    ctx.slots.inject("settings.section", function () {
      return ctx.slots.register({
        name: "settings.section",
        id: "dsh-email-push",
        order: 50,
        label: function () { return "邮件推送"; },
      }, function () { return h(EmailPushSection); });
    });
  };
  return module.exports;
}});
