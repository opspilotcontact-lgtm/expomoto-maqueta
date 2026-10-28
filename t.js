/* Expomoto · tienda: filtros (carnet, uso, marca, estilo), barrido de la estela y «Mi lista».
   Sin JS, la página ya enseña todas las motos: esto solo filtra lo que hay en el HTML. */
(function () {
  var NIVEL = { am: 0, a1: 1, a2: 2, a: 3 };
  var VENTAS_MAIL = document.body.dataset.mail;
  var VENTAS_TEL = document.body.dataset.tel;

  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function leer(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v || d; } catch (e) { return d; } }

  /* ---------- Filtros ---------- */
  var caja = document.querySelector('[data-tienda]');
  if (caja) {
    var rejilla = caja.querySelector('.rejilla');
    var tarjetas = Array.prototype.slice.call(rejilla.querySelectorAll('.mc'));
    var tope = +caja.dataset.tope || 0;
    var cuenta = caja.querySelector('[data-cuenta]');
    var verTodas = caja.querySelector('[data-ver-todas]');
    var vacio = caja.querySelector('.vacio');
    var orden = caja.querySelector('[data-orden]');
    var estado = { carnet: caja.dataset.carnet || '', uso: '', marca: caja.dataset.marca || '', estilo: caja.dataset.estilo || '' };

    var q = new URLSearchParams(location.search);
    ['carnet', 'uso', 'marca', 'estilo'].forEach(function (k) { if (q.get(k)) estado[k] = q.get(k); });

    function pinta(barrer) {
      var n = 0, vistos = 0;
      tarjetas.forEach(function (t) {
        var ok = true;
        if (estado.carnet) { var c = t.dataset.c; ok = c !== '' && +c <= NIVEL[estado.carnet]; }
        if (ok && estado.uso) ok = (' ' + t.dataset.u + ' ').indexOf(' ' + estado.uso + ' ') > -1;
        if (ok && estado.marca) ok = t.dataset.m === estado.marca;
        if (ok && estado.estilo) ok = (' ' + t.dataset.e + ' ').indexOf(' ' + estado.estilo + ' ') > -1;
        if (ok) n++;
        var mostrar = ok && (!tope || vistos < tope);
        if (mostrar) vistos++;
        t.hidden = !mostrar;
      });
      if (cuenta) cuenta.textContent = n === 1 ? '1 moto' : n + ' motos';
      if (vacio) vacio.hidden = n > 0;
      if (verTodas) {
        var p = new URLSearchParams();
        ['carnet', 'uso', 'marca', 'estilo'].forEach(function (k) { if (estado[k]) p.set(k, estado[k]); });
        verTodas.href = verTodas.dataset.base + (p.toString() ? '?' + p : '');
        verTodas.textContent = n > tope ? 'Ver las ' + n + ' en la tienda' : 'Ir a la tienda';
      }
      caja.querySelectorAll('[data-f]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(estado[b.dataset.f] === b.dataset.v));
      });
      if (!tope && history.replaceState) {
        var u = new URLSearchParams();
        ['carnet', 'uso', 'marca', 'estilo'].forEach(function (k) { if (estado[k] && !caja.dataset[k]) u.set(k, estado[k]); });
        history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : ''));
      }
      if (barrer && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        rejilla.classList.remove('barre'); void rejilla.offsetWidth; rejilla.classList.add('barre');
      }
    }
    caja.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]');
      if (!b) return;
      e.preventDefault();
      var f = b.dataset.f, v = b.dataset.v;
      estado[f] = estado[f] === v ? '' : v;
      pinta(true);
    });
    if (orden) orden.addEventListener('change', function () {
      var k = orden.value;
      tarjetas.sort(function (a, b) {
        if (k === 'cc') return (+a.dataset.cc || 9999) - (+b.dataset.cc || 9999);
        if (k === 'cc-') return (+b.dataset.cc || 0) - (+a.dataset.cc || 0);
        return a.dataset.n.localeCompare(b.dataset.n, 'es');
      }).forEach(function (t) { rejilla.appendChild(t); });
      if (vacio) rejilla.appendChild(vacio);
      pinta(true);
    });
    pinta(false);
  }

  /* ---------- Mi lista ---------- */
  var lista = leer('expomoto-lista', []);
  var barra = document.querySelector('.mi-lista');
  function nombreDe(slug) {
    var el = document.querySelector('[data-slug="' + slug + '"]');
    return el ? el.dataset.nombre : slug;
  }
  function pintaLista() {
    document.querySelectorAll('[data-anadir]').forEach(function (b) {
      var on = lista.some(function (x) { return x.s === b.dataset.anadir; });
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? (b.dataset.on || 'En tu lista') : (b.dataset.off || '+ A mi lista');
    });
    if (!barra) return;
    barra.classList.toggle('on', lista.length > 0);
    barra.querySelector('[data-n]').textContent = lista.length === 1 ? '1 moto' : lista.length + ' motos';
    barra.querySelector('[data-nombres]').textContent = lista.map(function (x) { return x.n; }).join(' · ');
    var cuerpo = 'Hola, me interesan estas motos que he visto en vuestra web:\n\n' +
      lista.map(function (x) { return '- ' + x.n + ' (' + x.u + ')'; }).join('\n') +
      '\n\nMi carnet es: \nLa usaría para: \nMi teléfono: \n';
    barra.querySelector('[data-escribir]').href = 'mailto:' + VENTAS_MAIL + '?subject=' +
      encodeURIComponent('Consulta desde la web: ' + lista.map(function (x) { return x.n; }).join(', ')) +
      '&body=' + encodeURIComponent(cuerpo);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-anadir]');
    if (b) {
      e.preventDefault();
      var s = b.dataset.anadir, i = -1;
      lista.forEach(function (x, j) { if (x.s === s) i = j; });
      if (i > -1) lista.splice(i, 1); else lista.push({ s: s, n: b.dataset.nombre || nombreDe(s), u: new URL(b.dataset.url, location.href).href });
      guardar('expomoto-lista', lista);
      pintaLista();
    }
    if (e.target.closest('[data-vaciar]')) { lista = []; guardar('expomoto-lista', lista); pintaLista(); }
  });
  pintaLista();
})();
