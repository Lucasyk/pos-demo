const products = [
	{ id: 1, name: "アメリカーノ", price: 400, cat: "ドリンク" },
	{ id: 2, name: "カフェラテ", price: 500, cat: "ドリンク" },
	{ id: 3, name: "スパニッシュラテ", price: 550, cat: "ドリンク" },
	{ id: 4, name: "キャラメルラテ", price: 550, cat: "ドリンク" },
	{ id: 5, name: "チョコバナナマフィン", price: 250, cat: "パン" },
	{ id: 6, name: "チーズエンサイマーダ", price: 350, cat: "パン" },
	{ id: 7, name: "シナモンロール", price: 350, cat: "パン" },
	{ id: 8, name: "ウベロール", price: 350, cat: "パン" },
	{ id: 9, name: "ウベチーズパンデサル", price: 200, cat: "パン" },
	{ id: 10, name: "ウベバスクチーズケーキ", price: 500, cat: "デザート" },
	{ id: 11, name: "イェマケーキ", price: 600, cat: "デザート" },
];
const $ = (id) => document.getElementById(id),
	yen = (n) =>
		new Intl.NumberFormat("ja-JP", {
			style: "currency",
			currency: "JPY",
		}).format(n);
const pay = $("pay"),
	receiptDialog = $("receiptDialog"),
	historyDialog = $("history");
let cart = {},
	category = "すべて",
	method = "現金",
	sales = [];
let storageOK = true;
try {
	sales = JSON.parse(localStorage.getItem("ipad-pos-sales-v1") || "[]");
	if (!Array.isArray(sales)) throw Error();
} catch (e) {
	storageOK = false;
	$("status").textContent = "売上履歴を読み込めません。登録を停止しました。";
}
const lines = () =>
	products
		.filter((p) => cart[p.id] > 0)
		.map((p) => ({ ...p, qty: cart[p.id] }));
const total = () => lines().reduce((s, p) => s + p.price * p.qty, 0);
function render() {
	$("tabs").replaceChildren();
	for (const c of ["すべて", ...new Set(products.map((p) => p.cat))]) {
		const b = document.createElement("button");
		b.textContent = c;
		b.className = c === category ? "active" : "";
		b.onclick = () => {
			category = c;
			render();
		};
		$("tabs").append(b);
	}
	$("menu").replaceChildren();
	for (const p of products.filter(
		(p) => category === "すべて" || p.cat === category,
	)) {
		const b = document.createElement("button");
		b.className = "item";
		b.innerHTML = `${p.name}<span>${yen(p.price)}</span>`;
		b.onclick = () => {
			cart[p.id] = (cart[p.id] || 0) + 1;
			render();
		};
		$("menu").append(b);
	}
	$("cart").replaceChildren();
	if (!lines().length) {
		$("cart").innerHTML = '<p class="empty">商品が選択されていません</p>';
	}
	for (const p of lines()) {
		const r = document.createElement("div");
		r.className = "cartrow";
		r.innerHTML = `<div><strong>${p.name}</strong><div class="muted">${yen(p.price)} × ${p.qty} = ${yen(p.price * p.qty)}</div></div><div class="qty"><button aria-label="${p.name}を減らす">−</button><strong>${p.qty}</strong><button aria-label="${p.name}を増やす">＋</button></div>`;
		const [minus, plus] = r.querySelectorAll("button");
		minus.onclick = () => {
			cart[p.id]--;
			if (!cart[p.id]) delete cart[p.id];
			render();
		};
		plus.onclick = () => {
			cart[p.id]++;
			render();
		};
		$("cart").append(r);
	}
	$("count").textContent = lines().reduce((s, p) => s + p.qty, 0) + " 点";
	$("total").textContent = yen(total());
	$("checkout").disabled = !total() || !storageOK;
	$("clear").disabled = !total();
}
function updatePay() {
	const n = Number($("received").value),
		valid =
			$("received").value !== "" && Number.isSafeInteger(n) && n >= total();
	$("change").textContent = valid ? yen(n - total()) : "—";
	$("register").disabled =
		!storageOK || !total() || (method === "現金" && !valid);
	$("cashFields").hidden = method !== "現金";
	$("cardNote").hidden = method === "現金";
	$("cash").className = method === "現金" ? "active" : "";
	$("card").className = method === "現金" ? "" : "active";
}
$("checkout").onclick = () => {
	method = "現金";
	$("received").value = "";
	$("due").textContent = yen(total());
	updatePay();
	pay.showModal();
};
$("cash").onclick = () => {
	method = "現金";
	updatePay();
};
$("card").onclick = () => {
	method = "キャッシュレス";
	updatePay();
};
$("received").oninput = updatePay;
$("exact").onclick = () => {
	$("received").value = total();
	updatePay();
};
$("clear").onclick = () => {
	if (confirm("注文をクリアしますか？")) {
		cart = {};
		render();
	}
};
$("register").onclick = () => {
	updatePay();
	if ($("register").disabled) return;
	const sale = {
		id: "POS-" + Date.now(),
		date: new Date().toISOString(),
		items: lines(),
		total: total(),
		method,
		received: method === "現金" ? Number($("received").value) : null,
		change: method === "現金" ? Number($("received").value) - total() : null,
	};
	try {
		localStorage.setItem("ipad-pos-sales-v1", JSON.stringify([...sales, sale]));
	} catch (e) {
		$("status").textContent = "保存できませんでした。会計は未登録です。";
		alert("売上を保存できませんでした。");
		return;
	}
	sales.push(sale);
	$("receipt").textContent = [
		"Cafe Tayo",
		sale.id,
		new Date(sale.date).toLocaleString("ja-JP"),
		"----------------",
		...sale.items.map((p) => `${p.name} × ${p.qty}  ${yen(p.price * p.qty)}`),
		"----------------",
		"合計（税込） " + yen(sale.total),
		sale.method,
		...(sale.received === null
			? []
			: ["お預かり " + yen(sale.received), "お釣り " + yen(sale.change)]),
		"ありがとうございました。温かいパンをお召し上がり下さい。",
	].join("\n");
	cart = {};
	pay.close();
	render();
	receiptDialog.showModal();
};
$("historyBtn").onclick = () => {
	const today = new Date().toLocaleDateString("ja-JP");
	$("daily").textContent = yen(
		sales
			.filter((s) => new Date(s.date).toLocaleDateString("ja-JP") === today)
			.reduce((a, s) => a + s.total, 0),
	);
	$("sales").replaceChildren();
	if (!sales.length) $("sales").textContent = "売上はまだありません";
	for (const s of [...sales].reverse()) {
		const d = document.createElement("div");
		d.className = "cartrow";
		d.textContent =
			new Date(s.date).toLocaleString("ja-JP") +
			" / " +
			s.method +
			" / " +
			yen(s.total);
		$("sales").append(d);
	}
	historyDialog.showModal();
};
$("export").onclick = () => {
	const rows = [
		["ID", "日時", "商品", "数量", "単価", "小計", "支払方法"],
		...sales.flatMap((s) =>
			s.items.map((p) => [
				s.id,
				s.date,
				p.name,
				p.qty,
				p.price,
				p.price * p.qty,
				s.method,
			]),
		),
	];
	const csv =
		"\ufeff" +
		rows
			.map((r) =>
				r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
			)
			.join("\r\n");
	const url = URL.createObjectURL(
		new Blob([csv], { type: "text/csv;charset=utf-8" }),
	);
	const a = document.createElement("a");
	a.href = url;
	a.download = "pos-sales.csv";
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
};
render();
