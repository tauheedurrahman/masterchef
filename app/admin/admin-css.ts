/**
 * Admin stylesheet, kept as a string and injected by app/admin/layout.tsx.
 *
 * Deliberately not in globals.css: the customer site's stylesheet stays
 * untouched, and nothing here can leak into it — every rule is scoped under
 * `.adm`. Fonts reuse the Oswald/Inter variables the root layout already sets.
 */
export const ADMIN_CSS = `
.adm {
  --ink: #12100f;
  --paper: #faf8f5;
  --line: #e4ded6;
  --muted: #6f6459;
  --accent: #e8a33d;
  --blue: #2563eb;
  --amber: #d97706;
  --purple: #7c3aed;
  --green: #15803d;
  --red: #b91c1c;

  display: flex;
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 14px;
}
.adm * { box-sizing: border-box; }
.adm h1, .adm h2, .adm h3 {
  font-family: var(--font-oswald), system-ui, sans-serif;
  letter-spacing: .04em;
  text-transform: uppercase;
  margin: 0;
}

/* ---------------------------------------------------------- sidebar */
.adm__side {
  width: 218px;
  flex: 0 0 218px;
  background: var(--ink);
  color: #f6efe3;
  padding: 22px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: sticky;
  top: 0;
  height: 100vh;
}
.adm__brand {
  display: flex; align-items: center; gap: 9px;
  padding: 0 8px 18px; margin-bottom: 8px;
  border-bottom: 1px solid #2c2724;
}
.adm__brand b { font-family: var(--font-oswald), sans-serif; font-size: 15px; letter-spacing: .08em; }
.adm__brand span { display: block; font-size: 11px; color: #a89e93; letter-spacing: .04em; }
.adm__nav {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 9px 11px; border-radius: 7px;
  color: #cdc4b8; text-decoration: none; font-size: 13.5px;
}
.adm__nav:hover { background: #201c1a; color: #f6efe3; }
.adm__nav[data-active="true"] { background: var(--accent); color: #12100f; font-weight: 600; }
.adm__badge {
  min-width: 20px; padding: 1px 6px; border-radius: 999px;
  background: var(--red); color: #fff; font-size: 11px; font-weight: 700; text-align: center;
}
.adm__side form { margin-top: auto; }
.adm__signout {
  width: 100%; padding: 9px 11px; border-radius: 7px; cursor: pointer;
  background: transparent; border: 1px solid #2c2724; color: #a89e93;
  font: inherit; font-size: 13px; text-align: left;
}
.adm__signout:hover { border-color: var(--red); color: #f0b4b4; }

/* ---------------------------------------------------------- content */
.adm__main { flex: 1; min-width: 0; padding: 26px 30px 60px; }
.adm__head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
.adm__head h1 { font-size: 21px; }
.adm__sub { color: var(--muted); font-size: 13px; margin: 4px 0 0; }

.adm__card { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 18px; }
.adm__grid { display: grid; gap: 14px; }
.adm__grid--stats { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
.adm__grid--2 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }

.adm__stat b { display: block; font-family: var(--font-oswald), sans-serif; font-size: 27px; line-height: 1.15; }
.adm__stat span { display: block; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .07em; margin-top: 4px; }

/* CSS-only bars — no chart library */
.adm__bar { display: grid; grid-template-columns: 132px 1fr 42px; align-items: center; gap: 10px; margin-bottom: 9px; font-size: 13px; }
.adm__bar-track { background: #efe9e1; border-radius: 999px; height: 9px; overflow: hidden; }
.adm__bar-fill { height: 100%; border-radius: 999px; background: var(--accent); transition: width .3s; }
.adm__bar b { text-align: right; font-variant-numeric: tabular-nums; }

/* ---------------------------------------------------------- tables */
.adm__tablewrap { overflow-x: auto; }
.adm table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.adm th {
  text-align: left; font-family: var(--font-oswald), sans-serif;
  font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--muted); padding: 9px 10px; border-bottom: 1px solid var(--line); white-space: nowrap;
}
.adm td { padding: 11px 10px; border-bottom: 1px solid #f0ebe4; vertical-align: middle; }
.adm tbody tr[data-clickable="true"] { cursor: pointer; }
.adm tbody tr:hover { background: #fdfbf8; }
.adm__num { font-variant-numeric: tabular-nums; }

/* ---------------------------------------------------------- pills */
.adm__pill {
  display: inline-block; padding: 3px 9px; border-radius: 999px;
  font-size: 11.5px; font-weight: 600; letter-spacing: .03em; white-space: nowrap;
}
.adm__pill[data-s="new"] { background: #dbeafe; color: var(--blue); }
.adm__pill[data-s="preparing"] { background: #fef3c7; color: var(--amber); }
.adm__pill[data-s="out_for_delivery"] { background: #ede9fe; color: var(--purple); }
.adm__pill[data-s="delivered"] { background: #dcfce7; color: var(--green); }
.adm__pill[data-s="cancelled"] { background: #fee2e2; color: var(--red); }

/* ---------------------------------------------------------- controls */
.adm__tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.adm__tab {
  padding: 7px 13px; border-radius: 7px; cursor: pointer; font: inherit; font-size: 13px;
  background: #fff; border: 1px solid var(--line); color: var(--muted);
}
.adm__tab[data-active="true"] { background: var(--ink); border-color: var(--ink); color: #f6efe3; }

.adm__btn {
  padding: 8px 15px; border-radius: 7px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600;
  background: var(--ink); color: #f6efe3; border: 1px solid var(--ink);
}
.adm__btn:hover { background: #2c2724; }
.adm__btn:disabled { opacity: .55; cursor: not-allowed; }
.adm__btn--ghost { background: #fff; color: var(--ink); }
.adm__btn--ghost:hover { background: #f4efe8; }
.adm__btn--danger { background: var(--red); border-color: var(--red); color: #fff; }
.adm__btn--sm { padding: 5px 10px; font-size: 12px; }

.adm label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 5px; }
.adm input[type=text], .adm input[type=password], .adm input[type=number],
.adm input[type=email], .adm select, .adm textarea {
  width: 100%; padding: 9px 11px; border: 1px solid var(--line); border-radius: 7px;
  font: inherit; font-size: 13.5px; background: #fff; color: var(--ink);
}
.adm input:focus, .adm select:focus, .adm textarea:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
.adm textarea { min-height: 78px; resize: vertical; }
.adm__field { margin-bottom: 14px; }
.adm__row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.adm__check { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; color: var(--ink); margin: 0; }
.adm__check input { width: auto; }

.adm__error { background: #fee2e2; color: var(--red); border: 1px solid #fca5a5; border-radius: 7px; padding: 9px 12px; font-size: 13px; margin-bottom: 14px; }
.adm__ok { background: #dcfce7; color: var(--green); border: 1px solid #86efac; border-radius: 7px; padding: 9px 12px; font-size: 13px; margin-bottom: 14px; }
.adm__empty { color: var(--muted); text-align: center; padding: 34px 10px; font-size: 13.5px; }

/* toggle switch */
.adm__switch { position: relative; display: inline-block; width: 40px; height: 22px; flex: 0 0 40px; }
.adm__switch input { opacity: 0; width: 0; height: 0; }
.adm__switch span { position: absolute; inset: 0; background: #cfc7bd; border-radius: 999px; transition: .2s; cursor: pointer; }
.adm__switch span::before { content: ""; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .2s; }
.adm__switch input:checked + span { background: var(--green); }
.adm__switch input:checked + span::before { transform: translateX(18px); }

/* modal */
.adm__backdrop { position: fixed; inset: 0; background: rgba(18,16,15,.55); display: flex; align-items: flex-start; justify-content: center; padding: 30px 16px; overflow-y: auto; z-index: 50; }
.adm__modal { background: var(--paper); border-radius: 12px; width: 100%; max-width: 620px; padding: 22px; }
.adm__modal h2 { font-size: 17px; margin-bottom: 16px; }

/* login */
.adm--login { align-items: center; justify-content: center; }
.adm__login { width: 100%; max-width: 340px; }
.adm__login .adm__card { padding: 26px; }

/* ---------------------------------------------------------- tablet */
@media (max-width: 900px) {
  .adm { flex-direction: column; }
  .adm__side { width: 100%; flex: none; height: auto; position: static; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 6px; padding: 14px; }
  .adm__brand { border: 0; padding: 0 10px 0 0; margin: 0; }
  .adm__side form { margin: 0 0 0 auto; }
  .adm__main { padding: 18px 16px 50px; }
}

/* ---------------------------------------------------------- print */
.adm__ticket { display: none; }
@media print {
  .adm__side, .adm__tabs, .adm__btn, .adm__head, .adm__tablewrap, .adm__backdrop { display: none !important; }
  .adm, .adm__main { display: block; padding: 0; background: #fff; }
  .adm__ticket {
    display: block; font-family: var(--font-inter), monospace; color: #000;
    width: 76mm; padding: 4mm; font-size: 12px; line-height: 1.45;
  }
  .adm__ticket h2 { font-size: 15px; margin-bottom: 2mm; }
  .adm__ticket hr { border: 0; border-top: 1px dashed #000; margin: 2.5mm 0; }
  .adm__ticket table { width: 100%; font-size: 12px; }
  .adm__ticket td { padding: 1mm 0; border: 0; }
  @page { margin: 6mm; }
}
`;
