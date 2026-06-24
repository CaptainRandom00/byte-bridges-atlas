/**
 * BB Atlas — generator module
 *
 * Pure-function core: takes parsed JSON, returns HTML string.
 * Plus a file-I/O wrapper (generate) for the common case.
 *
 * Schema reference: ../SKILL.md
 *
 * All sections are optional except `project`. Missing keys → that
 * section / view is skipped (sprints, simulation, risks, pricing,
 * devlog, architecture, milestones).
 */
const fs = require('fs');
const path = require('path');

const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const riskColor = r => ({high:'var(--red)',med:'var(--amber)',low:'var(--teal)'}[r]||'var(--muted)');
const statusBadge = s => ({ready:'READY',planned:'PLANNED',active:'ACTIVE',done:'DONE'}[s]||String(s).toUpperCase());
const ownerColor = o => ({iOS:'var(--cyan)',Data:'var(--teal)',Both:'var(--amber)'}[o]||'var(--muted)');

function generateString(D, dataPathHint) {
  const sprintsList = Array.isArray(D.sprints) ? D.sprints : [];
  const risksList   = Array.isArray(D.risks)   ? D.risks   : [];
  const devlogList  = Array.isArray(D.devlog)  ? D.devlog  : [];
  const milestonesList = Array.isArray(D.milestones) ? D.milestones : [];
  const archModules = (D.architecture && Array.isArray(D.architecture.modules)) ? D.architecture.modules : [];
  const archDataModel = (D.architecture && Array.isArray(D.architecture.dataModel)) ? D.architecture.dataModel : [];
  const hasArch = !!D.architecture;
  const hasSim = !!D.simulation && sprintsList.length > 0;
  const hasPricing = !!D.pricing;

  // Security (v1.1.0+)
  const sec = D.security || null;
  const secThreats = (sec && Array.isArray(sec.threats)) ? sec.threats : [];
  const secMitigations = (sec && Array.isArray(sec.mitigations)) ? sec.mitigations : [];
  const secPrinciples = (sec && Array.isArray(sec.principles)) ? sec.principles : [];
  const secCompliance = (sec && Array.isArray(sec.compliance)) ? sec.compliance : [];
  const hasSecurity = !!sec && (secThreats.length || secMitigations.length || secPrinciples.length || secCompliance.length);
  const mitigationById = id => secMitigations.find(m=>m.id===id);
  const threatById     = id => secThreats.find(t=>t.id===id);
  const SEV_ORDER = { high: 0, med: 1, low: 2 };
  const STATUS_ORDER = { 'verified': 0, 'in-progress': 1, 'planned': 2, 'dropped': 3 };
  const sevColor = s => ({high:'var(--red)',med:'var(--amber)',low:'var(--teal)'}[s]||'var(--muted)');
  const statusColor = s => ({verified:'var(--teal)','in-progress':'var(--cyan)',planned:'var(--muted)',dropped:'var(--red)'}[s]||'var(--muted)');

  // SEO (v1.2.0+)
  const seo = D.seo || null;
  const seoFindings   = (seo && Array.isArray(seo.findings))   ? seo.findings   : [];
  const seoPrinciples = (seo && Array.isArray(seo.principles)) ? seo.principles : [];
  const seoAudits     = (seo && Array.isArray(seo.audits))     ? seo.audits     : [];
  const seoChecks     = (seo && Array.isArray(seo.checks))     ? seo.checks     : [];
  const seoStatusHealth = (seo && seo.statusHealth) ? seo.statusHealth : null;
  const hasSeo = !!seo && (seoFindings.length || seoPrinciples.length || seoAudits.length || seoChecks.length || !!seoStatusHealth);
  const findingById = id => seoFindings.find(f=>f.id===id);
  const SEO_SEV_ORDER  = { P1: 0, P2: 1, P3: 2 };
  const seoSevColor    = s => ({P1:'var(--red)',P2:'var(--amber)',P3:'var(--teal)'}[s]||'var(--muted)');
  const seoStatusColor = s => ({fixed:'var(--teal)','in-progress':'var(--cyan)',open:'var(--red)',wontfix:'var(--muted)'}[s]||'var(--muted)');
  const SEO_AREA_LABEL = { sitemap:'Sitemap', robots:'Robots.txt', canonical:'Canonical', redirects:'Redirects', status:'Status codes', '404':'404 handling', meta:'Meta / OG', schema:'JSON-LD schema', content:'Content depth', other:'Other' };

  const totalWeeks = sprintsList.length ? Math.max(...sprintsList.map(s=>s.weeks[1])) : 0;
  const _ab = (D.project.atlasBrand || D.project.name).split(' ');
  const brandLockup = (_ab.length>1 ? esc(_ab.slice(0,-1).join(' '))+'<b>'+esc(_ab.slice(-1)[0])+'</b>' : '<b>'+esc(_ab[0])+'</b>') + ' · atlas';
  const sprintById = id => sprintsList.find(s=>s.id===id);
  const moduleById = id => archModules.find(m=>m.id===id);

  function buildOverview(){
    const sections = [];

    sections.push(`
    <header>
      <div class="eyebrow"><span class="pulse"></span> Living Atlas · auto-generated · click anything to drill in</div>
      <h1>${esc(D.project.name)}</h1>
      <p class="tagline">${esc(D.project.tagline)}</p>
      <div class="statusbar">
        ${D.project.status?`<div><b>STATUS</b> <span>${esc(D.project.status)}</span></div>`:''}
        ${D.project.phase?`<div><b>PHASE</b> <span>${esc(D.project.phase)}</span></div>`:''}
        ${D.project.updated?`<div><b>UPDATED</b> <span>${esc(D.project.updated)}</span></div>`:''}
        ${D.project.repo?`<div><b>REPO</b> <span>${esc(D.project.repo)}</span></div>`:''}
      </div>
    </header>`);

    if (Array.isArray(D.metrics) && D.metrics.length) {
      const metrics = D.metrics.map((m,i)=>`
        <div class="metric" style="animation-delay:${0.05*i}s">
          <div class="metric-val">${esc(m.value)}</div>
          <div class="metric-label">${esc(m.label)}</div>
          <div class="metric-unit">${esc(m.unit)}</div>
        </div>`).join('');
      sections.push(`<section><div class="sec-head">Snapshot</div><div class="metrics">${metrics}</div></section>`);
    }

    if (D.roadmap) {
      const rmCol = (items,kind)=>(items||[]).map(it=>{
        const inner = `
          <div class="rm-tag">${esc(it.tag||'')}</div>
          <div class="rm-title">${esc(it.title)}${it.link?' <span class="go">→</span>':''}</div>
          <div class="rm-detail">${esc(it.detail)}</div>`;
        return it.link
          ? `<a class="rm-card rm-${kind} linked" href="#/${it.link}">${inner}</a>`
          : `<div class="rm-card rm-${kind}">${inner}</div>`;
      }).join('');
      sections.push(`<section><div class="sec-head">Roadmap · cards link through</div>
        <div class="roadmap">
          <div class="rm-now"><div class="rm-col-head">▸ NOW</div>${rmCol(D.roadmap.now,'now')}</div>
          <div class="rm-next"><div class="rm-col-head">▸ NEXT</div>${rmCol(D.roadmap.next,'next')}</div>
          <div class="rm-later"><div class="rm-col-head">▸ LATER</div>${rmCol(D.roadmap.later,'later')}</div>
        </div></section>`);
    }

    if (sprintsList.length) {
      const sprints = sprintsList.map(s=>{
        const left=((s.weeks[0]-1)/totalWeeks)*100, width=((s.weeks[1]-s.weeks[0]+1)/totalWeeks)*100;
        return `
        <a class="sprint-row linked" href="#/sprint/${s.id}">
          <div class="sprint-meta">
            <span class="sprint-id">S${s.id}</span>
            <span class="sprint-name">${esc(s.name)}</span>
            <span class="sprint-pts">${s.points} pts</span>
            <span class="sprint-status st-${s.status}">${statusBadge(s.status)}</span>
            <span class="go">→</span>
          </div>
          <div class="sprint-track">
            <div class="sprint-bar" style="left:${left}%;width:${width}%;--rc:${riskColor(s.risk)}">
              <span class="bar-weeks">W${s.weeks[0]}–${s.weeks[1]}</span>
            </div>
          </div>
        </a>`;
      }).join('');
      const milestones = milestonesList.map(m=>{
        const left=(m.week/totalWeeks)*100;
        return `<div class="ms ${m.major?'ms-major':''}" style="left:${left}%"><div class="ms-dot"></div><div class="ms-week">W${m.week}</div><div class="ms-label">${esc(m.label)}</div></div>`;
      }).join('');
      sections.push(`<section><div class="sec-head">Sprint Timeline · click a sprint to open it</div>
        <div class="timeline"><div class="ms-track">${milestones}</div>${sprints}</div>
        ${hasArch?'<div class="arch-cta"><a class="big-link" href="#/arch">⊞ Open the Architecture Teardown — what is actually being built →</a></div>':''}
      </section>`);
    } else if (hasArch) {
      sections.push(`<section><div class="arch-cta"><a class="big-link" href="#/arch">⊞ Open the Architecture Teardown →</a></div></section>`);
    }

    if (hasSim) {
      sections.push(`<section><div class="sec-head">Schedule Simulation · Monte Carlo</div>
        <div class="sim-wrap">
          <div class="sim-canvas-box"><canvas id="simCanvas"></canvas><div class="sim-caption" id="simCaption"></div></div>
          <div class="sim-stats">
            <div class="sim-stat p50"><div class="sim-pct">P50 · LIKELY</div><div class="sim-week">Week <b id="p50">–</b></div><div class="sim-sub">50% of runs finish by here</div></div>
            <div class="sim-stat p80"><div class="sim-pct">P80 · SAFE</div><div class="sim-week">Week <b id="p80">–</b></div><div class="sim-sub">plan-to date — 80% confidence</div></div>
            <div class="sim-stat p90"><div class="sim-pct">P90 · WORST</div><div class="sim-week">Week <b id="p90">–</b></div><div class="sim-sub">only 10% run longer</div></div>
            <button class="rerun" onclick="runSim()">↻ Re-run ${D.simulation.runs.toLocaleString()} simulations</button>
          </div></div></section>`);
    }

    if (hasSecurity) {
      const counts = secMitigations.reduce((acc, m) => {
        const k = m.status || 'planned';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
      const totalThreats = secThreats.length;
      const totalMits = secMitigations.length;
      const verified = counts['verified'] || 0;
      const inProgress = counts['in-progress'] || 0;
      const planned = counts['planned'] || 0;
      const dropped = counts['dropped'] || 0;
      const sevCounts = secThreats.reduce((acc, t) => { acc[t.severity||'low'] = (acc[t.severity||'low']||0)+1; return acc; }, {});
      sections.push(`<section><div class="sec-head">Security model · click to open the threat-and-mitigation view</div>
        <a class="sec-tile linked" href="#/security">
          <div class="sec-tile-head">
            <span class="sec-shield">🛡</span>
            <span class="sec-tile-title">Security by design</span>
            <span class="go">→</span>
          </div>
          <div class="sec-tile-grid">
            <div class="sec-tile-stat"><div class="stat-val">${totalThreats}</div><div class="stat-label">Threats</div><div class="stat-sub">${sevCounts.high||0} high · ${sevCounts.med||0} med · ${sevCounts.low||0} low</div></div>
            <div class="sec-tile-stat"><div class="stat-val">${totalMits}</div><div class="stat-label">Mitigations</div><div class="stat-sub">${verified} verified · ${inProgress} in progress · ${planned} planned${dropped?` · ${dropped} dropped`:''}</div></div>
            <div class="sec-tile-stat"><div class="stat-val">${secPrinciples.length}</div><div class="stat-label">Principles</div><div class="stat-sub">${secPrinciples.filter(p=>p.verified).length} verified</div></div>
            <div class="sec-tile-stat"><div class="stat-val">${secCompliance.length}</div><div class="stat-label">Compliance</div><div class="stat-sub">${secCompliance.filter(c=>c.status==='verified').length} verified</div></div>
          </div>
        </a></section>`);
    }

    if (hasSeo) {
      const sevCounts = seoFindings.reduce((acc, f) => { acc[f.severity||'P3'] = (acc[f.severity||'P3']||0)+1; return acc; }, {});
      const statusCounts = seoFindings.reduce((acc, f) => { acc[f.status||'open'] = (acc[f.status||'open']||0)+1; return acc; }, {});
      const sh = seoStatusHealth || {};
      const total2xx = sh['2xx']||0, total3xx = sh['3xx']||0, total4xx = sh['4xx']||0, total5xx = sh['5xx']||0;
      const healthSub = (total2xx+total3xx+total4xx+total5xx) > 0
        ? `${total2xx} 2xx · ${total3xx} 3xx · ${total4xx} 4xx${total5xx?` · ${total5xx} 5xx`:''}`
        : `${seoAudits.length} audit${seoAudits.length===1?'':'s'} on file`;
      sections.push(`<section><div class="sec-head">SEO posture · click to open findings + audits</div>
        <a class="seo-tile linked" href="#/seo">
          <div class="seo-tile-head">
            <span class="seo-mag">🔎</span>
            <span class="seo-tile-title">SEO findings + audits</span>
            <span class="go">→</span>
          </div>
          <div class="seo-tile-grid">
            <div class="seo-tile-stat"><div class="stat-val">${sevCounts.P1||0}</div><div class="stat-label">P1</div><div class="stat-sub">${statusCounts.fixed||0} fixed · ${statusCounts['in-progress']||0} in progress · ${statusCounts.open||0} open</div></div>
            <div class="seo-tile-stat"><div class="stat-val">${sevCounts.P2||0}</div><div class="stat-label">P2</div><div class="stat-sub">important — should land</div></div>
            <div class="seo-tile-stat"><div class="stat-val">${sevCounts.P3||0}</div><div class="stat-label">P3</div><div class="stat-sub">nice-to-have</div></div>
            <div class="seo-tile-stat"><div class="stat-val">${seoPrinciples.length||seoChecks.length}</div><div class="stat-label">${seoPrinciples.length?'Principles':'Checks'}</div><div class="stat-sub">${healthSub}</div></div>
          </div>
        </a></section>`);
    }

    if (risksList.length) {
      const risks = risksList.map(r=>{
        const sp = r.sprint?sprintById(r.sprint):null;
        const isSec = r.kind === 'security';
        return `<div class="risk-row${isSec?' risk-security':''}">
          <div class="risk-sev" style="background:${riskColor(r.severity)}"></div>
          <div class="risk-body">
            <div class="risk-head"><span class="risk-name">${isSec?'<span class="risk-shield" title="Security risk">🛡</span> ':''}${esc(r.name)}</span>${(typeof r.prob==='number'||r.delayWeeks)?`<span class="risk-prob">${Math.round((r.prob||0)*100)}%${r.delayWeeks?` · +${r.delayWeeks}w`:''}</span>`:''}</div>
            <div class="risk-impact">${esc(r.impact)}</div>
            <div class="risk-mit">↳ ${esc(r.mitigation)}${sp?` · <a class="ilink" href="#/sprint/${sp.id}">S${sp.id} ${esc(sp.name)}</a>`:''}</div>
          </div></div>`;
      }).join('');
      const heading = D.risksLabel || 'Risk Register';
      sections.push(`<section><div class="sec-head">${esc(heading)}</div>${risks}</section>`);
    }

    if (hasPricing) {
      const pricing = `<div class="price-grid">
        <div class="price-card free"><div class="price-tier">FREE</div><ul>${(D.pricing.free||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>
        <div class="price-card paid"><div class="price-tier">PREMIUM</div>
          <div class="price-amt">${esc(D.pricing.monthly)}<span>/mo</span></div>
          <div class="price-annual">or ${esc(D.pricing.annual)}/yr · save ${esc(D.pricing.annualSaving)}</div>
          <ul>${(D.pricing.paid||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>
      </div>`;
      sections.push(`<section><div class="sec-head">Pricing · ${esc(D.pricing.model||'')}</div>${pricing}</section>`);
    }

    if (devlogList.length) {
      const devlog = devlogList.map(e=>{
        const tags = Array.isArray(e.tags) ? e.tags : [];
        const hasSecTag = tags.includes('security');
        const hasSeoTag = tags.includes('seo');
        const glyphs = `${hasSecTag?'<span class="log-shield" title="Security-tagged entry">🛡</span> ':''}${hasSeoTag?'<span class="log-mag" title="SEO-tagged entry">🔎</span> ':''}`;
        const tagSpans = tags.map(t=>{
          const cls = t==='security' ? ' log-tag-sec' : t==='seo' ? ' log-tag-seo' : '';
          return `<span class="log-tag${cls}">${esc(t)}</span>`;
        }).join('');
        return `
        <div class="log-entry${hasSecTag?' log-security':''}${hasSeoTag?' log-seo':''}"><div class="log-date">${esc(e.date)}</div>
          <div class="log-body"><div class="log-title">${glyphs}${esc(e.title)} ${tagSpans}</div>
            <div class="log-text">${esc(e.body)}</div></div></div>`;
      }).join('');
      sections.push(`<section><div class="sec-head">${esc(D.devlogLabel||'Devlog')}</div>${devlog}</section>`);
    }

    return sections.join('\n');
  }

  function buildSprint(s){
    const depChips = (s.depends||[]).length
      ? s.depends.map(id=>{const d=sprintById(id);return `<a class="dep-chip in" href="#/sprint/${id}">↰ S${id} ${esc(d?d.name:'')}</a>`;}).join('')
      : '<span class="dep-none">none — critical-path starter</span>';
    const unblockChips = (s.unblocks||[]).length
      ? s.unblocks.map(id=>{const d=sprintById(id);return `<a class="dep-chip out" href="#/sprint/${id}">S${id} ${esc(d?d.name:'')} ↳</a>`;}).join('')
      : '<span class="dep-none">terminal — unblocks nothing further</span>';
    const rows = (s.tasks||[]).map(t=>{
      const sec = t.security;
      const secMit = sec && sec.mitigation ? mitigationById(sec.mitigation) : null;
      const secChip = sec
        ? `<a class="task-sec" href="#/security" title="Mitigation ${esc(sec.mitigation||'')}${secMit?` — ${esc(secMit.name)}`:''}${sec.ac?`\n\nSecurity AC: ${sec.ac}`:''}">🔒 ${esc(sec.mitigation||'security')}</a>`
        : '';
      const secAc = sec && sec.ac ? `<div class="task-ac task-ac-sec">🔒 ${esc(sec.ac)}</div>` : '';
      const tseo = t.seo;
      const tseoFinding = tseo && tseo.finding ? findingById(tseo.finding) : null;
      const seoChip = tseo
        ? `<a class="task-seo" href="#/seo" title="Finding ${esc(tseo.finding||'')}${tseoFinding?` — ${esc(tseoFinding.name||'')}`:''}${tseo.ac?`\n\nSEO AC: ${tseo.ac}`:''}">🔎 ${esc(tseo.finding||'seo')}</a>`
        : '';
      const seoAc = tseo && tseo.ac ? `<div class="task-ac task-ac-seo">🔎 ${esc(tseo.ac)}</div>` : '';
      return `
      <div class="task${sec?' task-with-sec':''}${tseo?' task-with-seo':''}">
        <div class="task-top">
          <span class="task-name">${esc(t.name)}</span>
          <span class="task-owner" style="color:${ownerColor(t.owner)};border-color:${ownerColor(t.owner)}">${esc(t.owner)}</span>
          <span class="task-est">${t.est} pts</span>
          <span class="task-story">${esc(t.story)}</span>
          ${secChip}
          ${seoChip}
        </div>
        <div class="task-ac">✓ ${esc(t.ac)}</div>
        ${secAc}
        ${seoAc}
      </div>`;
    }).join('');
    const sprintRisks = risksList.filter(r=>r.sprint===s.id).map(r=>`
      <div class="mini-risk"><span class="dot" style="background:${riskColor(r.severity)}"></span>
        <b>${esc(r.name)}</b> — ${esc(r.mitigation)} ${typeof r.prob==='number'?`<span class="risk-prob">${Math.round(r.prob*100)}%</span>`:''}</div>`).join('')
      || '<div class="dep-none">no sprint-specific risks flagged</div>';
    return `
    <nav class="crumbs"><a href="#/">Overview</a> <span>/</span> <b>Sprint ${s.id}</b></nav>
    <div class="detail-head">
      <div class="dh-id">SPRINT ${s.id}</div>
      <h1>${esc(s.name)}</h1>
      <div class="dh-meta">
        <span class="chip">${s.points} pts</span>
        <span class="chip st-${s.status}">${statusBadge(s.status)}</span>
        <span class="chip">Weeks ${s.weeks[0]}–${s.weeks[1]}</span>
        <span class="chip" style="color:${riskColor(s.risk)};border-color:${riskColor(s.risk)}">${String(s.risk||'').toUpperCase()} RISK</span>
      </div>
      <p class="dh-goal">${esc(s.goal)}</p>
      <div class="dh-deliverable">▸ Deliverable: ${esc(s.deliverable)}</div>
    </div>
    <div class="detail-grid">
      <div class="dep-box"><div class="dep-label">Depends on</div>${depChips}</div>
      <div class="dep-box"><div class="dep-label">Unblocks</div>${unblockChips}</div>
    </div>
    <div class="sec-head">Tasks · ${(s.tasks||[]).length} tickets · ${s.points} pts</div>
    <div class="task-list">${rows}</div>
    <div class="sec-head">Risks in this sprint</div>
    <div class="mini-risks">${sprintRisks}</div>
    <div class="pager">${s.id>1?`<a href="#/sprint/${s.id-1}">← S${s.id-1}</a>`:'<span></span>'}${sprintById(s.id+1)?`<a href="#/sprint/${s.id+1}">S${s.id+1} →</a>`:'<span></span>'}</div>`;
  }

  function buildArch(){
    const card = m=>`
      <a class="mod-card linked" href="#/module/${m.id}">
        <div class="mod-kind ${m.kind}">${String(m.kind||'').toUpperCase()}</div>
        <div class="mod-name">${esc(m.name)} <span class="go">→</span></div>
        <div class="mod-role">${esc(m.role)}</div>
        <div class="mod-foot"><span class="mod-state">${esc(m.state)}</span></div>
      </a>`;
    const defaultKindLabels = {feature:'Feature modules · click to dissect', shared:'Shared layers'};
    const kinds = [...new Set(archModules.map(m=>m.kind).filter(Boolean))];
    const kindBlocks = kinds.map(k=>{
      const list = archModules.filter(m=>m.kind===k).map(card).join('');
      const label = (D.architecture.kindLabels && D.architecture.kindLabels[k])
        || defaultKindLabels[k]
        || (k.charAt(0).toUpperCase()+k.slice(1)+' modules');
      return `<div class="sec-head">${esc(label)}</div><div class="mod-grid">${list}</div>`;
    }).join('');
    const dm = archDataModel.length ? `<div class="sec-head">${esc(D.architecture.dataModelLabel||'Data model')}</div><div class="dm-table">${
      archDataModel.map(e=>`
        <div class="dm-row"><div class="dm-entity">${esc(e.entity)}</div>
          <div class="dm-fields">${(e.fields||[]).map(f=>`<span class="dm-field">${esc(f)}</span>`).join('')}</div>
          <div class="dm-rel">${esc(e.relations)}</div></div>`).join('')
    }</div>` : '';
    const archTitle = D.architecture.title || "What's being built";
    const archEyebrow = D.architecture.eyebrow || 'ARCHITECTURE TEARDOWN';
    const archCrumb = D.architecture.crumb || 'Architecture Teardown';
    return `
    <nav class="crumbs"><a href="#/">Overview</a> <span>/</span> <b>${esc(archCrumb)}</b></nav>
    <div class="detail-head">
      <div class="dh-id">${esc(archEyebrow)}</div>
      <h1>${esc(archTitle)}</h1>
      <p class="dh-goal">${esc(D.architecture.summary||'')}</p>
    </div>
    ${kindBlocks}
    ${dm}`;
  }

  function buildModule(m){
    const depChips = (m.depends||[]).length
      ? m.depends.map(id=>{const d=moduleById(id);return `<a class="dep-chip in" href="#/module/${id}">${esc(d?d.name:id)}</a>`;}).join('')
      : '<span class="dep-none">no internal dependencies</span>';
    const sprintChips = (m.sprints||[]).map(id=>{const s=sprintById(id);return `<a class="dep-chip out" href="#/sprint/${id}">S${id} ${esc(s?s.name:'')}</a>`;}).join('');
    const stories = (m.stories||[]).map(st=>`<span class="story-chip">${esc(st)}</span>`).join('');
    const archEyebrow = (D.architecture && D.architecture.eyebrow) || 'Architecture';
    return `
    <nav class="crumbs"><a href="#/">Overview</a> <span>/</span> <a href="#/arch">${esc(archEyebrow)}</a> <span>/</span> <b>${esc(m.name)}</b></nav>
    <div class="detail-head">
      <div class="dh-id">${String(m.kind||'').toUpperCase()} MODULE</div>
      <h1>${esc(m.name)}</h1>
      ${m.state?`<div class="dh-meta"><span class="chip">${esc(m.state)}</span></div>`:''}
      <p class="dh-goal">${esc(m.role)}</p>
      ${m.detail?`<div class="dh-deliverable">${esc(m.detail)}</div>`:''}
    </div>
    <div class="detail-grid">
      <div class="dep-box"><div class="dep-label">Depends on</div>${depChips}</div>
      ${sprintChips?`<div class="dep-box"><div class="dep-label">Built in sprints</div>${sprintChips}</div>`:''}
    </div>
    ${stories?`<div class="dep-box wide"><div class="dep-label">User stories satisfied</div>${stories}</div>`:''}
    ${buildModuleSecurity(m)}
    ${buildModuleSeo(m)}`;
  }

  function buildModuleSeo(m){
    if (!m.seo) return '';
    const ms = m.seo;
    const findingChips = (ms.findings || []).map(fid => {
      const f = findingById(fid);
      return `<a class="dep-chip seo-finding-chip" href="#/seo" title="${esc(f?f.name||'':fid)}"><span class="seo-sev-dot" style="background:${seoSevColor(f?f.severity:'')}"></span>${esc(fid)}</a>`;
    }).join('');
    const rows = [];
    if (ms.routes && ms.routes.length) rows.push(`<div class="sec-mod-row"><div class="sec-mod-key">Routes</div><div class="sec-mod-val">${ms.routes.map(r=>`<span class="story-chip">${esc(r)}</span>`).join('')}</div></div>`);
    if (ms.indexable !== undefined) rows.push(`<div class="sec-mod-row"><div class="sec-mod-key">Indexable</div><div class="sec-mod-val"><code>${ms.indexable===true?'yes':ms.indexable===false?'no':esc(ms.indexable)}</code></div></div>`);
    if (ms.canonical) rows.push(`<div class="sec-mod-row"><div class="sec-mod-key">Canonical</div><div class="sec-mod-val"><code>${esc(ms.canonical)}</code></div></div>`);
    if (ms.schemaTypes && ms.schemaTypes.length) rows.push(`<div class="sec-mod-row"><div class="sec-mod-key">Schema types</div><div class="sec-mod-val">${ms.schemaTypes.map(t=>`<code>${esc(t)}</code>`).join(' ')}</div></div>`);
    if (findingChips) rows.push(`<div class="sec-mod-row"><div class="sec-mod-key">Findings</div><div class="sec-mod-val">${findingChips}</div></div>`);
    if (!rows.length) return '';
    return `<div class="sec-head">🔎 SEO posture · <a class="ilink" href="#/seo">open SEO findings</a></div>
    <div class="sec-mod-grid">${rows.join('')}</div>`;
  }

  function buildModuleSecurity(m){
    if (!m.security) return '';
    const sm = m.security;
    const threatChips = (sm.threats || []).map(tid => {
      const t = threatById(tid);
      return `<a class="dep-chip sec-threat-chip" href="#/security" title="${esc(t?t.name:tid)}"><span class="sec-sev-dot" style="background:${sevColor(t?t.severity:'')}"></span>${esc(tid)}</a>`;
    }).join('');
    const mitChips = (sm.mitigations || []).map(mid => {
      const mit = mitigationById(mid);
      return `<a class="dep-chip sec-mit-chip" href="#/security" title="${esc(mit?mit.name:mid)}"><span class="sec-status-dot" style="background:${statusColor(mit?mit.status:'')}"></span>${esc(mid)}</a>`;
    }).join('');
    const rows = [];
    if (sm.dataClasses && sm.dataClasses.length) rows.push(`<div class="sec-mod-row"><div class="sec-mod-key">Data classes</div><div class="sec-mod-val">${sm.dataClasses.map(c=>`<span class="story-chip">${esc(c)}</span>`).join('')}</div></div>`);
    if (sm.atRest) rows.push(`<div class="sec-mod-row"><div class="sec-mod-key">At rest</div><div class="sec-mod-val"><code>${esc(sm.atRest)}</code></div></div>`);
    if (sm.atTransit) rows.push(`<div class="sec-mod-row"><div class="sec-mod-key">In transit</div><div class="sec-mod-val"><code>${esc(sm.atTransit)}</code></div></div>`);
    if (threatChips) rows.push(`<div class="sec-mod-row"><div class="sec-mod-key">Exposed to</div><div class="sec-mod-val">${threatChips}</div></div>`);
    if (mitChips) rows.push(`<div class="sec-mod-row"><div class="sec-mod-key">Implements</div><div class="sec-mod-val">${mitChips}</div></div>`);
    return `<div class="sec-head">🛡 Security posture · <a class="ilink" href="#/security">open security model</a></div>
    <div class="sec-mod-grid">${rows.join('')}</div>`;
  }

  function buildSecurity(){
    const summary = (sec && sec.summary) || 'Threats this product faces, mitigations we have decided on, and where each one lives in the plan.';

    // Principles strip
    const principles = secPrinciples.length ? `
    <div class="sec-head">Principles · invariants every phase must honour</div>
    <div class="sec-principles">
      ${secPrinciples.map(p=>`
        <div class="sec-principle${p.verified?' verified':''}">
          ${p.id?`<span class="sec-pid">${esc(p.id)}</span>`:''}
          <span class="sec-pname">${esc(p.name||'')}</span>
          ${p.scope?`<span class="sec-pscope">${esc(p.scope)}</span>`:''}
          <span class="sec-pverify">${p.verified?'✓ verified':'…'}</span>
        </div>`).join('')}
    </div>` : '';

    // Threat-rooted pane: threats grouped by severity (high → med → low)
    const threatsSorted = [...secThreats].sort((a,b)=>(SEV_ORDER[a.severity]??9)-(SEV_ORDER[b.severity]??9));
    const threatPane = threatsSorted.length ? threatsSorted.map(t => {
      const sevLabel = (t.severity||'low').toUpperCase();
      const appliesChips = (t.appliesTo||[]).map(mid => {
        const m = moduleById(mid);
        return `<a class="dep-chip in" href="#/module/${esc(mid)}">${esc(m?m.name:mid)}</a>`;
      }).join('');
      const mitCards = (t.mitigations||[]).map(mid => {
        const m = mitigationById(mid);
        if (!m) return `<div class="sec-mit-row missing"><span class="sec-mit-id">${esc(mid)}</span><span class="sec-mit-name">(undefined mitigation)</span></div>`;
        const sp = m.sprint ? sprintById(m.sprint) : null;
        const mod = m.module ? moduleById(m.module) : null;
        const loc = [
          mod ? `<a class="ilink" href="#/module/${esc(mod.id)}">${esc(mod.name)}</a>` : null,
          sp ? `<a class="ilink" href="#/sprint/${esc(sp.id)}">S${esc(sp.id)} ${esc(sp.name)}</a>` : null,
          m.taskRef ? `<span class="sec-task-ref">task: ${esc(m.taskRef)}</span>` : null
        ].filter(Boolean).join(' · ');
        return `<div class="sec-mit-row" id="m-${esc(m.id)}">
          <div class="sec-mit-top">
            <span class="sec-mit-id">${esc(m.id)}</span>
            <span class="sec-mit-name">${esc(m.name||'')}</span>
            <span class="sec-status-pill" style="color:${statusColor(m.status)};border-color:${statusColor(m.status)}">${esc((m.status||'planned').toUpperCase())}</span>
          </div>
          ${loc?`<div class="sec-mit-loc">${loc}</div>`:''}
          ${m.evidence?`<div class="sec-mit-evidence">✓ Evidence: ${esc(m.evidence)}</div>`:''}
        </div>`;
      }).join('') || '<div class="dep-none">no mitigations declared yet — this is a gap</div>';
      return `<div class="sec-threat-card" id="t-${esc(t.id)}">
        <div class="sec-threat-top">
          <span class="sec-sev sev-${esc(t.severity||'low')}" style="background:${sevColor(t.severity)};color:#0A0E27">${esc(sevLabel)}</span>
          <span class="sec-tid">${esc(t.id||'')}</span>
          <span class="sec-tname">${esc(t.name||'')}</span>
          ${typeof t.likelihood==='number'?`<span class="sec-tlike">${Math.round(t.likelihood*100)}% likelihood</span>`:''}
        </div>
        ${t.impact?`<div class="sec-timpact">${esc(t.impact)}</div>`:''}
        ${appliesChips?`<div class="sec-applies"><span class="sec-applies-label">Applies to:</span> ${appliesChips}</div>`:''}
        <div class="sec-mits-wrap">
          <div class="sec-mits-label">Mitigations</div>
          <div class="sec-mits">${mitCards}</div>
        </div>
      </div>`;
    }).join('') : '<div class="dep-none">no threats declared yet</div>';

    // Mitigation-rooted pane: mitigations grouped by status
    const mitGroups = {};
    secMitigations.forEach(m => {
      const k = m.status || 'planned';
      (mitGroups[k] = mitGroups[k] || []).push(m);
    });
    const statusKeys = Object.keys(mitGroups).sort((a,b)=>(STATUS_ORDER[a]??9)-(STATUS_ORDER[b]??9));
    const mitPane = statusKeys.length ? statusKeys.map(status => {
      const group = mitGroups[status];
      return `<div class="sec-status-group">
        <div class="sec-status-head" style="color:${statusColor(status)}">${esc(status.toUpperCase().replace('-',' '))} · ${group.length}</div>
        ${group.map(m => {
          const sp = m.sprint ? sprintById(m.sprint) : null;
          const mod = m.module ? moduleById(m.module) : null;
          const coveringThreats = secThreats.filter(t => Array.isArray(t.mitigations) && t.mitigations.includes(m.id));
          const threatChips = coveringThreats.map(t => `<a class="dep-chip sec-threat-chip" href="#/security" title="${esc(t.name||'')}"><span class="sec-sev-dot" style="background:${sevColor(t.severity)}"></span>${esc(t.id)}</a>`).join('');
          const loc = [
            mod ? `<a class="ilink" href="#/module/${esc(mod.id)}">${esc(mod.name)}</a>` : null,
            sp ? `<a class="ilink" href="#/sprint/${esc(sp.id)}">S${esc(sp.id)} ${esc(sp.name)}</a>` : null,
            m.owner ? `<span class="task-owner" style="color:${ownerColor(m.owner)};border-color:${ownerColor(m.owner)}">${esc(m.owner)}</span>` : null
          ].filter(Boolean).join(' · ');
          return `<div class="sec-mit-card">
            <div class="sec-mit-top">
              <span class="sec-mit-id">${esc(m.id)}</span>
              <span class="sec-mit-name">${esc(m.name||'')}</span>
            </div>
            ${loc?`<div class="sec-mit-loc">${loc}</div>`:''}
            ${m.taskRef?`<div class="sec-mit-evidence">▸ task: ${esc(m.taskRef)}</div>`:''}
            ${m.evidence?`<div class="sec-mit-evidence">✓ Evidence: ${esc(m.evidence)}</div>`:''}
            ${threatChips?`<div class="sec-mit-covers"><span class="sec-mit-covers-label">Covers:</span> ${threatChips}</div>`:''}
          </div>`;
        }).join('')}
      </div>`;
    }).join('') : '<div class="dep-none">no mitigations declared yet</div>';

    // Compliance checklist
    const compliance = secCompliance.length ? `
    <div class="sec-head">Compliance checklist</div>
    <div class="sec-compliance">
      ${secCompliance.map(c=>{
        const sp = c.sprint ? sprintById(c.sprint) : null;
        return `<div class="sec-comp-row">
          <span class="sec-status-pill" style="color:${statusColor(c.status)};border-color:${statusColor(c.status)}">${esc((c.status||'planned').toUpperCase())}</span>
          <span class="sec-comp-name">${esc(c.name||'')}</span>
          ${sp?`<a class="ilink" href="#/sprint/${esc(sp.id)}">S${esc(sp.id)} ${esc(sp.name)}</a>`:''}
          ${c.verifiedBy?`<span class="sec-comp-verif">via ${esc(c.verifiedBy)}</span>`:''}
        </div>`;
      }).join('')}
    </div>` : '';

    return `
    <nav class="crumbs"><a href="#/">Overview</a> <span>/</span> <b>Security</b></nav>
    <div class="detail-head">
      <div class="dh-id">🛡 SECURITY MODEL</div>
      <h1>Security by design</h1>
      <p class="dh-goal">${esc(summary)}</p>
    </div>
    ${principles}
    <div class="sec-toggle">
      <button class="sec-tab active" data-tab="threat" type="button">Threat-rooted</button>
      <button class="sec-tab" data-tab="mit" type="button">Mitigation-rooted</button>
    </div>
    <div class="sec-pane sec-pane-threat active">${threatPane}</div>
    <div class="sec-pane sec-pane-mit">${mitPane}</div>
    ${compliance}`;
  }

  function buildSeo(){
    const summary = (seo && seo.summary) || 'SEO findings, audit history, and the principles every public surface should honour.';
    const publicUrl = seo && seo.publicUrl ? seo.publicUrl : '';

    // Principles strip
    const principles = seoPrinciples.length ? `
    <div class="sec-head">Principles · invariants every public surface must honour</div>
    <div class="sec-principles">
      ${seoPrinciples.map(p=>`
        <div class="sec-principle${p.verified?' verified':''}">
          ${p.id?`<span class="sec-pid">${esc(p.id)}</span>`:''}
          <span class="sec-pname">${esc(p.name||'')}</span>
          ${p.scope?`<span class="sec-pscope">${esc(p.scope)}</span>`:''}
          <span class="sec-pverify">${p.verified?'✓ verified':'…'}</span>
        </div>`).join('')}
    </div>` : '';

    // Status-code health table
    const sh = seoStatusHealth || {};
    const shHas = Object.keys(sh).length > 0;
    const healthTable = shHas ? `
    <div class="sec-head">Status-code health</div>
    <div class="seo-health">
      ${['2xx','3xx','4xx','5xx','0'].filter(k=>sh[k]!==undefined).map(k=>{
        const colors = { '2xx':'var(--teal)', '3xx':'var(--cyan)', '4xx':'var(--amber)', '5xx':'var(--red)', '0':'var(--muted)' };
        return `<div class="seo-health-cell" style="border-color:${colors[k]}"><div class="seo-health-val" style="color:${colors[k]}">${sh[k]}</div><div class="seo-health-label">${esc(k)}</div></div>`;
      }).join('')}
    </div>` : '';

    // Per-check matrix (sitemap / robots / canonical / ...)
    const checks = seoChecks.length ? `
    <div class="sec-head">Site-wide checks</div>
    <div class="seo-checks">
      ${seoChecks.map(c=>{
        const color = c.status==='present'?'var(--teal)':c.status==='partial'?'var(--amber)':c.status==='missing'?'var(--red)':'var(--muted)';
        return `<div class="seo-check-row">
          <span class="seo-check-dot" style="background:${color}"></span>
          <span class="seo-check-name">${esc(c.name||'')}</span>
          <span class="sec-status-pill" style="color:${color};border-color:${color}">${esc(String(c.status||'unknown').toUpperCase())}</span>
          ${c.note?`<span class="seo-check-note">${esc(c.note)}</span>`:''}
        </div>`;
      }).join('')}
    </div>` : '';

    // Finding-rooted pane: findings grouped by severity (P1 → P2 → P3)
    const findingsSorted = [...seoFindings].sort((a,b)=>(SEO_SEV_ORDER[a.severity]??9)-(SEO_SEV_ORDER[b.severity]??9));
    const sevGroups = {};
    findingsSorted.forEach(f => { const k = f.severity || 'P3'; (sevGroups[k] = sevGroups[k] || []).push(f); });
    const findingCard = f => {
      const sp = f.sprint ? sprintById(f.sprint) : null;
      const mod = f.module ? moduleById(f.module) : null;
      const loc = [
        mod ? `<a class="ilink" href="#/module/${esc(mod.id)}">${esc(mod.name)}</a>` : null,
        sp ? `<a class="ilink" href="#/sprint/${esc(sp.id)}">S${esc(sp.id)} ${esc(sp.name)}</a>` : null,
        f.audit ? `<span class="seo-audit-ref">audit: ${esc(f.audit)}</span>` : null
      ].filter(Boolean).join(' · ');
      const status = f.status || 'open';
      return `<div class="seo-finding-card" id="f-${esc(f.id)}">
        <div class="seo-finding-top">
          <span class="seo-sev sev-${esc(f.severity||'P3')}" style="background:${seoSevColor(f.severity)};color:#0A0E27">${esc(f.severity||'P3')}</span>
          <span class="sec-tid">${esc(f.id||'')}</span>
          <span class="sec-tname">${esc(f.name||'')}</span>
          <span class="sec-status-pill" style="color:${seoStatusColor(status)};border-color:${seoStatusColor(status)}">${esc(status.toUpperCase().replace('-',' '))}</span>
          ${f.area?`<span class="seo-area-pill">${esc(SEO_AREA_LABEL[f.area]||f.area)}</span>`:''}
        </div>
        ${f.summary?`<div class="sec-timpact">${esc(f.summary)}</div>`:''}
        ${f.fix?`<div class="seo-fix"><span class="seo-fix-label">Fix:</span> ${esc(f.fix)}</div>`:''}
        ${f.evidence?`<div class="sec-mit-evidence">▸ Evidence: ${esc(f.evidence)}</div>`:''}
        ${loc?`<div class="sec-mit-loc">${loc}</div>`:''}
      </div>`;
    };
    const sevKeys = Object.keys(sevGroups).sort((a,b)=>(SEO_SEV_ORDER[a]??9)-(SEO_SEV_ORDER[b]??9));
    const findingPane = sevKeys.length ? sevKeys.map(sev => `
      <div class="sec-status-group">
        <div class="sec-status-head" style="color:${seoSevColor(sev)}">${esc(sev)} · ${sevGroups[sev].length}</div>
        ${sevGroups[sev].map(findingCard).join('')}
      </div>`).join('') : '<div class="dep-none">no findings recorded yet</div>';

    // Area-rooted pane: findings grouped by area
    const areaGroups = {};
    seoFindings.forEach(f => { const k = f.area || 'other'; (areaGroups[k] = areaGroups[k] || []).push(f); });
    const areaKeys = Object.keys(areaGroups);
    const areaPane = areaKeys.length ? areaKeys.map(area => `
      <div class="sec-status-group">
        <div class="sec-status-head" style="color:var(--cyan)">${esc(SEO_AREA_LABEL[area]||area)} · ${areaGroups[area].length}</div>
        ${areaGroups[area].sort((a,b)=>(SEO_SEV_ORDER[a.severity]??9)-(SEO_SEV_ORDER[b.severity]??9)).map(findingCard).join('')}
      </div>`).join('') : '<div class="dep-none">no findings recorded yet</div>';

    // Audit history
    const audits = seoAudits.length ? `
    <div class="sec-head">Audit history</div>
    <div class="seo-audits">
      ${seoAudits.map(a=>`<div class="seo-audit-row">
        <span class="seo-audit-date">${esc(a.date||'')}</span>
        <span class="seo-audit-target">${esc(a.target||'')}</span>
        ${a.scope?`<span class="seo-audit-scope">${esc(a.scope)}</span>`:''}
        ${a.summary?`<div class="seo-audit-summary">${esc(a.summary)}</div>`:''}
        ${a.source?`<div class="seo-audit-source">▸ <code>${esc(a.source)}</code></div>`:''}
      </div>`).join('')}
    </div>` : '';

    return `
    <nav class="crumbs"><a href="#/">Overview</a> <span>/</span> <b>SEO</b></nav>
    <div class="detail-head">
      <div class="dh-id">🔎 SEO POSTURE</div>
      <h1>SEO findings &amp; audits</h1>
      <p class="dh-goal">${esc(summary)}</p>
      ${publicUrl?`<div class="dh-deliverable">▸ Public URL: <code>${esc(publicUrl)}</code></div>`:''}
    </div>
    ${principles}
    ${healthTable}
    ${checks}
    <div class="seo-toggle">
      <button class="seo-tab active" data-tab="sev" type="button">By severity</button>
      <button class="seo-tab" data-tab="area" type="button">By area</button>
    </div>
    <div class="seo-pane seo-pane-sev active">${findingPane}</div>
    <div class="seo-pane seo-pane-area">${areaPane}</div>
    ${audits}`;
  }

  const views = [];
  views.push(`<div class="view" data-route="/">${buildOverview()}</div>`);
  sprintsList.forEach(s=>views.push(`<div class="view" data-route="/sprint/${s.id}">${buildSprint(s)}</div>`));
  if (hasArch) {
    views.push(`<div class="view" data-route="/arch">${buildArch()}</div>`);
    archModules.forEach(m=>views.push(`<div class="view" data-route="/module/${m.id}">${buildModule(m)}</div>`));
  }
  if (hasSecurity) {
    views.push(`<div class="view" data-route="/security">${buildSecurity()}</div>`);
  }
  if (hasSeo) {
    views.push(`<div class="view" data-route="/seo">${buildSeo()}</div>`);
  }

  const inputFileLabel = dataPathHint ? path.basename(dataPathHint) : 'project.json';

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(D.project.name)} · Living Atlas</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--bg:#0A0E27;--surface:#141934;--surface2:#1A1F3A;--border:#2A3152;--text:#E5E7EB;--muted:#9CA3AF;--blue:#0066CC;--cyan:#00D9FF;--teal:#06D6A0;--amber:#FFA500;--red:#E63946;--display:'Chakra Petch',sans-serif;--body:'IBM Plex Sans',sans-serif;--mono:'IBM Plex Mono',monospace}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--body);line-height:1.5;background-image:radial-gradient(circle at 15% 8%,rgba(0,217,255,.06),transparent 42%),radial-gradient(circle at 85% 92%,rgba(6,214,160,.05),transparent 42%);background-attachment:fixed;min-height:100vh}
.grain{position:fixed;inset:0;pointer-events:none;opacity:.025;z-index:1;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.topnav{position:sticky;top:0;z-index:50;background:rgba(10,14,39,.82);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
.topnav .inner{max-width:1180px;margin:0 auto;padding:13px 24px;display:flex;align-items:center;gap:22px}
.brand{font-family:var(--display);font-weight:700;font-size:15px;color:var(--text);text-decoration:none;letter-spacing:.3px}
.brand b{color:var(--cyan)}
.topnav a.nav{font-family:var(--mono);font-size:12px;color:var(--muted);text-decoration:none;text-transform:uppercase;letter-spacing:1.5px;transition:.2s}
.topnav a.nav:hover,.topnav a.nav.active{color:var(--cyan)}
.spacer{flex:1}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.view{display:none;animation:fade .4s ease}
.view.active{display:block}
@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
header{border-bottom:1px solid var(--border);padding:44px 0 30px;position:relative}
.eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:3px;color:var(--cyan);text-transform:uppercase;margin-bottom:14px;display:flex;align-items:center;gap:10px}
.pulse{width:7px;height:7px;border-radius:50%;background:var(--teal);box-shadow:0 0 0 0 rgba(6,214,160,.6);animation:pulse 2.4s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(6,214,160,.5)}70%{box-shadow:0 0 0 9px rgba(6,214,160,0)}100%{box-shadow:0 0 0 0 rgba(6,214,160,0)}}
h1{font-family:var(--display);font-weight:700;font-size:clamp(30px,5vw,52px);line-height:1.04;letter-spacing:-.5px;margin-bottom:12px}
.tagline{color:var(--muted);font-size:17px;max-width:680px;margin-bottom:22px}
.statusbar{display:flex;gap:26px;flex-wrap:wrap;font-family:var(--mono);font-size:12.5px}
.statusbar b{color:var(--cyan);font-weight:500} .statusbar span{color:var(--muted)}
section{padding:40px 0;border-bottom:1px solid var(--border);position:relative;z-index:2}
.sec-head{font-family:var(--mono);font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:var(--teal);margin:34px 0 22px;display:flex;align-items:center;gap:12px}
.sec-head::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--border),transparent)}
.go{color:var(--cyan);font-family:var(--mono);opacity:.6;transition:.2s}
.linked:hover .go{opacity:1;transform:translateX(3px)}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
.metric{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;opacity:0;transform:translateY(14px);animation:rise .6s forwards}
@keyframes rise{to{opacity:1;transform:none}}
.metric-val{font-family:var(--display);font-weight:700;font-size:30px;color:var(--cyan);line-height:1}
.metric-label{font-size:13px;margin-top:8px} .metric-unit{font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:3px}
.roadmap{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.rm-col-head{font-family:var(--display);font-weight:600;font-size:15px;margin-bottom:12px}
.rm-now .rm-col-head{color:var(--cyan)} .rm-next .rm-col-head{color:var(--teal)} .rm-later .rm-col-head{color:var(--muted)}
.rm-card{display:block;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--border);border-radius:8px;padding:13px 15px;margin-bottom:10px;transition:.25s;text-decoration:none;color:inherit}
.rm-card.linked:hover{transform:translateX(4px);border-color:var(--cyan)}
.rm-now{border-left-color:var(--cyan)} .rm-next{border-left-color:var(--teal)}
.rm-tag{font-family:var(--mono);font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}
.rm-title{font-weight:600;font-size:14.5px;margin-bottom:3px} .rm-detail{font-size:13px;color:var(--muted)}
.timeline{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px 26px}
.ms-track{position:relative;height:54px;margin-bottom:8px}
.ms{position:absolute;transform:translateX(-50%);text-align:center;top:0}
.ms-dot{width:10px;height:10px;border-radius:50%;background:var(--muted);margin:0 auto 6px;border:2px solid var(--bg)}
.ms-major .ms-dot{background:var(--cyan);box-shadow:0 0 10px var(--cyan)}
.ms-week{font-family:var(--mono);font-size:10px;color:var(--muted)}
.ms-label{font-size:9.5px;color:var(--muted);max-width:74px;line-height:1.2;margin-top:2px}
.ms-major .ms-label{color:var(--cyan);font-weight:600}
.sprint-row{display:block;margin-bottom:6px;border-radius:8px;padding:9px;transition:.2s;text-decoration:none;color:inherit}
.sprint-row:hover{background:var(--surface2)}
.sprint-meta{display:flex;align-items:center;gap:10px;margin-bottom:6px;font-size:13px}
.sprint-id{font-family:var(--mono);font-weight:600;color:var(--cyan);font-size:12px}
.sprint-name{font-weight:600;flex:1} .sprint-pts{font-family:var(--mono);font-size:11px;color:var(--muted)}
.sprint-status{font-family:var(--mono);font-size:9.5px;padding:2px 7px;border-radius:4px;letter-spacing:1px}
.st-ready{background:rgba(6,214,160,.15);color:var(--teal)} .st-planned{background:rgba(156,163,175,.12);color:var(--muted)} .st-active{background:rgba(0,217,255,.15);color:var(--cyan)} .st-done{background:rgba(6,214,160,.25);color:var(--teal)}
.sprint-track{position:relative;height:22px;background:var(--bg);border-radius:6px;overflow:hidden}
.sprint-bar{position:absolute;top:0;height:100%;border-radius:6px;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) 70%,transparent),var(--rc));display:flex;align-items:center;padding:0 9px;min-width:60px;transform-origin:left;animation:grow .8s ease-out}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.bar-weeks{font-family:var(--mono);font-size:10px;color:var(--bg);font-weight:600;white-space:nowrap}
.arch-cta{margin-top:20px;text-align:center}
.big-link{display:inline-block;font-family:var(--mono);font-size:13px;color:var(--cyan);text-decoration:none;border:1px solid var(--border);border-radius:9px;padding:13px 22px;transition:.2s;background:var(--surface)}
.big-link:hover{border-color:var(--cyan);background:rgba(0,217,255,.07)}
.sim-wrap{display:grid;grid-template-columns:1.4fr 1fr;gap:24px;align-items:start}
@media(max-width:820px){.sim-wrap,.roadmap,.detail-grid,.mod-grid{grid-template-columns:1fr!important}}
.sim-canvas-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px}
#simCanvas{width:100%;height:260px;display:block}
.sim-caption{font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:10px;line-height:1.5}
.sim-stats{display:flex;flex-direction:column;gap:12px}
.sim-stat{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px;position:relative;overflow:hidden}
.sim-stat::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--cyan)}
.sim-stat.p80::before{background:var(--amber)} .sim-stat.p90::before{background:var(--red)}
.sim-pct{font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:1px}
.sim-week{font-family:var(--display);font-weight:700;font-size:26px;margin-top:2px} .sim-week b{color:var(--cyan)}
.sim-sub{font-size:12px;color:var(--muted);margin-top:2px}
.rerun{font-family:var(--mono);font-size:12px;background:var(--surface2);color:var(--cyan);border:1px solid var(--border);border-radius:7px;padding:9px 14px;cursor:pointer;transition:.2s;margin-top:4px}
.rerun:hover{border-color:var(--cyan);background:rgba(0,217,255,.08)}
.risk-row{display:flex;gap:14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px}
.risk-sev{width:4px;border-radius:3px;flex-shrink:0}
.risk-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:4px}
.risk-name{font-weight:600;font-size:14.5px} .risk-prob{font-family:var(--mono);font-size:11px;color:var(--amber)}
.risk-impact{font-size:13px} .risk-mit{font-size:12.5px;color:var(--muted);margin-top:4px}
.ilink{color:var(--cyan);text-decoration:none} .ilink:hover{text-decoration:underline}
.price-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:680px){.price-grid{grid-template-columns:1fr}}
.price-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px}
.price-card.paid{border-color:var(--teal);box-shadow:0 0 30px rgba(6,214,160,.07)}
.price-tier{font-family:var(--mono);font-size:12px;letter-spacing:2px;color:var(--muted)} .price-card.paid .price-tier{color:var(--teal)}
.price-amt{font-family:var(--display);font-weight:700;font-size:38px;margin:8px 0 2px} .price-amt span{font-size:16px;color:var(--muted)}
.price-annual{font-size:13px;color:var(--cyan);margin-bottom:14px}
.price-card ul{list-style:none;margin-top:14px}
.price-card li{font-size:13px;padding:6px 0 6px 20px;position:relative;border-top:1px solid var(--border)}
.price-card li::before{content:'›';position:absolute;left:4px;color:var(--teal)}
.log-entry{display:flex;gap:18px;padding:16px 0;border-bottom:1px solid var(--border)}
.log-entry:last-child{border-bottom:none}
.log-date{font-family:var(--mono);font-size:12px;color:var(--cyan);flex-shrink:0;width:92px;padding-top:2px}
.log-title{font-weight:600;font-size:15px;margin-bottom:4px}
.log-tag{font-family:var(--mono);font-size:9.5px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 6px;color:var(--muted);text-transform:uppercase;margin-left:4px}
.log-text{font-size:13.5px;color:var(--muted);line-height:1.6}
.crumbs{font-family:var(--mono);font-size:12px;color:var(--muted);padding:24px 0 4px;display:flex;gap:10px;align-items:center}
.crumbs a{color:var(--cyan);text-decoration:none} .crumbs a:hover{text-decoration:underline} .crumbs b{color:var(--text)}
.detail-head{padding:18px 0 28px;border-bottom:1px solid var(--border)}
.dh-id{font-family:var(--mono);font-size:12px;letter-spacing:3px;color:var(--cyan);margin-bottom:10px}
.dh-meta{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
.chip{font-family:var(--mono);font-size:11px;border:1px solid var(--border);border-radius:5px;padding:4px 9px;color:var(--muted)}
.dh-goal{font-size:16px;color:var(--text);max-width:760px;margin-top:8px}
.dh-deliverable{font-size:14px;color:var(--teal);margin-top:14px;font-family:var(--mono)}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}
.dep-box{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px}
.dep-label{font-family:var(--mono);font-size:10.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
.dep-chip{display:inline-block;font-family:var(--mono);font-size:11.5px;text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:6px 11px;margin:0 7px 7px 0;transition:.2s}
.dep-chip.in{color:var(--cyan)} .dep-chip.out{color:var(--teal)}
.dep-chip:hover{border-color:currentColor;transform:translateY(-1px)}
.dep-none{font-size:13px;color:var(--muted);font-style:italic}
.story-chip{display:inline-block;font-family:var(--mono);font-size:11px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:4px 9px;margin:0 6px 6px 0;color:var(--amber)}
.task-list{display:flex;flex-direction:column;gap:9px}
.task{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;transition:.2s}
.task:hover{border-color:var(--cyan)}
.task-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.task-name{font-weight:600;font-size:14.5px;flex:1;min-width:200px}
.task-owner{font-family:var(--mono);font-size:10px;border:1px solid;border-radius:4px;padding:2px 7px;letter-spacing:.5px}
.task-est{font-family:var(--mono);font-size:11px;color:var(--muted)}
.task-story{font-family:var(--mono);font-size:10px;color:var(--amber);background:var(--surface2);padding:2px 6px;border-radius:4px}
.task-ac{font-size:12.5px;color:var(--muted);margin-top:8px;padding-left:2px;line-height:1.5}
.mini-risks{display:flex;flex-direction:column;gap:8px}
.mini-risk{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:11px 14px;font-size:13px;display:flex;align-items:center;gap:9px}
.mini-risk .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0} .mini-risk b{font-weight:600} .mini-risk .risk-prob{margin-left:auto}
.pager{display:flex;justify-content:space-between;margin:32px 0 60px;font-family:var(--mono);font-size:13px}
.pager a{color:var(--cyan);text-decoration:none;border:1px solid var(--border);border-radius:7px;padding:9px 15px;transition:.2s}
.pager a:hover{border-color:var(--cyan)}
.mod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.mod-card{display:block;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;text-decoration:none;color:inherit;transition:.25s}
.mod-card:hover{border-color:var(--cyan);transform:translateY(-2px)}
.mod-kind{font-family:var(--mono);font-size:9.5px;letter-spacing:1.5px;padding:2px 7px;border-radius:4px;display:inline-block;margin-bottom:10px}
.mod-kind.feature{background:rgba(0,217,255,.13);color:var(--cyan)} .mod-kind.shared{background:rgba(6,214,160,.13);color:var(--teal)}
.mod-kind.agent{background:rgba(255,165,0,.13);color:var(--amber)} .mod-kind.hook{background:rgba(230,57,70,.13);color:var(--red)}
.mod-kind.registry{background:rgba(0,102,204,.18);color:var(--cyan)} .mod-kind.plugin{background:rgba(6,214,160,.13);color:var(--teal)}
.mod-name{font-family:var(--display);font-weight:600;font-size:17px;margin-bottom:6px}
.mod-role{font-size:13px;color:var(--muted);line-height:1.45;min-height:38px}
.mod-foot{margin-top:12px;padding-top:10px;border-top:1px solid var(--border)}
.mod-state{font-family:var(--mono);font-size:10.5px;color:var(--cyan)}
.dm-table{display:flex;flex-direction:column;gap:8px}
.dm-row{display:grid;grid-template-columns:140px 1fr 200px;gap:14px;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:12px 15px;align-items:start}
@media(max-width:760px){.dm-row{grid-template-columns:1fr}}
.dm-entity{font-family:var(--display);font-weight:600;color:var(--cyan);font-size:14px}
.dm-field{display:inline-block;font-family:var(--mono);font-size:10.5px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 7px;margin:0 5px 5px 0;color:var(--muted)}
.dm-rel{font-size:12px;color:var(--teal);font-family:var(--mono)}
footer{padding:34px 0 60px;text-align:center;color:var(--muted);font-family:var(--mono);font-size:11.5px;line-height:1.8}
footer code{background:var(--surface2);padding:2px 7px;border-radius:4px;color:var(--cyan)}
/* ====== security view (v1.1.0) ====== */
.sec-shield{display:inline-block;filter:drop-shadow(0 0 6px rgba(0,217,255,.4))}
.sec-tile{display:block;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 22px;text-decoration:none;color:inherit;transition:.25s;position:relative;overflow:hidden}
.sec-tile::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--cyan),var(--teal))}
.sec-tile:hover{border-color:var(--cyan);transform:translateY(-2px)}
.sec-tile-head{display:flex;align-items:center;gap:12px;margin-bottom:14px;font-family:var(--display);font-weight:600;font-size:17px}
.sec-tile-title{flex:1}
.sec-tile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
.sec-tile-stat{padding:10px 4px}
.sec-tile-stat .stat-val{font-family:var(--display);font-weight:700;font-size:26px;color:var(--cyan);line-height:1}
.sec-tile-stat .stat-label{font-size:12px;margin-top:5px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-family:var(--mono)}
.sec-tile-stat .stat-sub{font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-top:5px;line-height:1.5}
.sec-principles{display:flex;flex-direction:column;gap:7px;margin-bottom:8px}
.sec-principle{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13.5px}
.sec-principle.verified{border-color:rgba(6,214,160,.35)}
.sec-pid{font-family:var(--mono);font-size:10.5px;color:var(--cyan);background:var(--surface2);padding:3px 8px;border-radius:4px;letter-spacing:.5px}
.sec-pname{font-weight:600;flex:1}
.sec-pscope{font-family:var(--mono);font-size:10.5px;color:var(--amber);text-transform:uppercase;letter-spacing:1px}
.sec-pverify{font-family:var(--mono);font-size:11px;color:var(--muted)}
.sec-principle.verified .sec-pverify{color:var(--teal)}
.sec-toggle{display:inline-flex;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:4px;gap:2px;margin:26px 0 14px}
.sec-tab{font-family:var(--mono);font-size:11.5px;letter-spacing:1.2px;text-transform:uppercase;background:transparent;color:var(--muted);border:none;border-radius:6px;padding:9px 16px;cursor:pointer;transition:.2s}
.sec-tab:hover{color:var(--text)}
.sec-tab.active{background:var(--surface2);color:var(--cyan)}
.sec-pane{display:none;flex-direction:column;gap:14px}
.sec-pane.active{display:flex}
.sec-threat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px;position:relative}
.sec-threat-card::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:3px;background:var(--muted)}
.sec-threat-card:has(.sev-high)::before{background:var(--red)}
.sec-threat-card:has(.sev-med)::before{background:var(--amber)}
.sec-threat-card:has(.sev-low)::before{background:var(--teal)}
.sec-threat-top{display:flex;align-items:center;gap:11px;flex-wrap:wrap;margin-bottom:8px}
.sec-sev{font-family:var(--mono);font-size:10px;font-weight:600;padding:3px 9px;border-radius:4px;letter-spacing:1.2px}
.sec-tid{font-family:var(--mono);font-size:11px;color:var(--cyan);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:3px 7px;letter-spacing:.5px}
.sec-tname{font-weight:600;font-size:15px;flex:1;min-width:200px}
.sec-tlike{font-family:var(--mono);font-size:11px;color:var(--amber)}
.sec-timpact{font-size:13px;color:var(--text);margin-bottom:10px;line-height:1.55}
.sec-applies{font-size:12.5px;color:var(--muted);margin-bottom:12px}
.sec-applies-label,.sec-mits-label,.sec-mit-covers-label{font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-right:6px}
.sec-mits-wrap{margin-top:8px;padding-top:12px;border-top:1px dashed var(--border)}
.sec-mits-label{display:block;margin-bottom:8px}
.sec-mits{display:flex;flex-direction:column;gap:8px}
.sec-mit-row{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 13px}
.sec-mit-row.missing{border-color:var(--red);color:var(--red)}
.sec-mit-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sec-mit-id{font-family:var(--mono);font-size:10.5px;color:var(--teal);background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:2px 7px;letter-spacing:.5px}
.sec-mit-name{font-weight:500;font-size:13px;flex:1;min-width:180px}
.sec-status-pill{font-family:var(--mono);font-size:9.5px;border:1px solid;border-radius:4px;padding:3px 8px;letter-spacing:1.2px;text-transform:uppercase}
.sec-mit-loc{font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:5px}
.sec-mit-evidence{font-size:12px;color:var(--teal);margin-top:5px;font-family:var(--mono)}
.sec-mit-covers{margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);font-size:12px;color:var(--muted)}
.sec-task-ref{font-family:var(--mono);color:var(--amber)}
.sec-status-group{margin-bottom:6px}
.sec-status-head{font-family:var(--mono);font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:14px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.sec-mit-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:8px}
.sec-compliance{display:flex;flex-direction:column;gap:8px}
.sec-comp-row{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13px;flex-wrap:wrap}
.sec-comp-name{flex:1;font-weight:500;min-width:180px}
.sec-comp-verif{font-family:var(--mono);font-size:11px;color:var(--muted)}
.sec-threat-chip,.sec-mit-chip{font-family:var(--mono);font-size:11px;text-decoration:none}
.sec-sev-dot,.sec-status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;vertical-align:middle}
/* per-module security posture */
.sec-mod-grid{display:flex;flex-direction:column;gap:8px}
.sec-mod-row{display:grid;grid-template-columns:140px 1fr;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;align-items:center}
@media(max-width:680px){.sec-mod-row{grid-template-columns:1fr}}
.sec-mod-key{font-family:var(--mono);font-size:10.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted)}
.sec-mod-val{font-size:13px}
.sec-mod-val code{font-family:var(--mono);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 7px;color:var(--teal);font-size:11.5px}
/* per-task 🔒 chip */
.task-sec{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:10.5px;color:var(--cyan);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 7px;text-decoration:none;transition:.2s}
.task-sec:hover{border-color:var(--cyan);background:rgba(0,217,255,.08)}
.task-with-sec{border-left:2px solid var(--cyan)}
.task-ac-sec{color:var(--cyan)!important;font-style:italic;border-top:1px dashed var(--border);padding-top:6px!important;margin-top:6px}
/* risk shield (kind:security) */
.risk-security{border-color:rgba(0,217,255,.35);box-shadow:0 0 18px rgba(0,217,255,.06)}
.risk-shield{margin-right:4px}
/* devlog shield + sec tag */
.log-security .log-title{color:var(--cyan)}
.log-shield{margin-right:4px}
.log-tag-sec{background:rgba(0,217,255,.12)!important;color:var(--cyan)!important;border-color:rgba(0,217,255,.35)!important}
/* ====== seo view (v1.2.0) ====== */
.seo-mag{display:inline-block;filter:drop-shadow(0 0 6px rgba(255,165,0,.45))}
.seo-tile{display:block;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 22px;text-decoration:none;color:inherit;transition:.25s;position:relative;overflow:hidden}
.seo-tile::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--amber),var(--teal))}
.seo-tile:hover{border-color:var(--amber);transform:translateY(-2px)}
.seo-tile-head{display:flex;align-items:center;gap:12px;margin-bottom:14px;font-family:var(--display);font-weight:600;font-size:17px}
.seo-tile-title{flex:1}
.seo-tile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
.seo-tile-stat{padding:10px 4px}
.seo-tile-stat .stat-val{font-family:var(--display);font-weight:700;font-size:26px;color:var(--amber);line-height:1}
.seo-tile-stat .stat-label{font-size:12px;margin-top:5px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-family:var(--mono)}
.seo-tile-stat .stat-sub{font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-top:5px;line-height:1.5}
.seo-health{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:8px}
.seo-health-cell{background:var(--surface);border:1px solid;border-radius:10px;padding:14px 12px;text-align:center}
.seo-health-val{font-family:var(--display);font-weight:700;font-size:24px;line-height:1}
.seo-health-label{font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:5px;letter-spacing:1.5px;text-transform:uppercase}
.seo-checks{display:flex;flex-direction:column;gap:7px;margin-bottom:8px}
.seo-check-row{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13px;flex-wrap:wrap}
.seo-check-dot{width:9px;height:9px;border-radius:50%}
.seo-check-name{font-weight:600;font-size:13.5px}
.seo-check-note{font-family:var(--mono);font-size:11.5px;color:var(--muted);flex:1;min-width:160px}
.seo-toggle{display:inline-flex;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:4px;gap:2px;margin:26px 0 14px}
.seo-tab{font-family:var(--mono);font-size:11.5px;letter-spacing:1.2px;text-transform:uppercase;background:transparent;color:var(--muted);border:none;border-radius:6px;padding:9px 16px;cursor:pointer;transition:.2s}
.seo-tab:hover{color:var(--text)}
.seo-tab.active{background:var(--surface2);color:var(--amber)}
.seo-pane{display:none;flex-direction:column;gap:14px}
.seo-pane.active{display:flex}
.seo-finding-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px;position:relative;margin-bottom:8px}
.seo-finding-card::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:3px;background:var(--muted)}
.seo-finding-card:has(.sev-P1)::before{background:var(--red)}
.seo-finding-card:has(.sev-P2)::before{background:var(--amber)}
.seo-finding-card:has(.sev-P3)::before{background:var(--teal)}
.seo-finding-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.seo-area-pill{font-family:var(--mono);font-size:10.5px;color:var(--cyan);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:3px 8px;letter-spacing:.5px}
.seo-fix{font-size:13px;color:var(--text);margin-top:6px;line-height:1.55}
.seo-fix-label{font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:1.2px;color:var(--amber);margin-right:6px}
.seo-finding-chip{font-family:var(--mono);font-size:11px;text-decoration:none}
.seo-sev-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;vertical-align:middle}
.seo-audits{display:flex;flex-direction:column;gap:8px}
.seo-audit-row{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 16px;font-size:13px}
.seo-audit-date{font-family:var(--mono);font-size:11px;color:var(--cyan);margin-right:10px;letter-spacing:.5px}
.seo-audit-target{font-weight:600}
.seo-audit-scope{font-family:var(--mono);font-size:10.5px;color:var(--amber);text-transform:uppercase;letter-spacing:1px;margin-left:10px}
.seo-audit-summary{font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.5}
.seo-audit-source{font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:5px}
.seo-audit-source code,.seo-audit-ref{font-family:var(--mono);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 7px;color:var(--amber);font-size:11.5px}
/* per-task 🔎 chip */
.task-seo{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:10.5px;color:var(--amber);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 7px;text-decoration:none;transition:.2s}
.task-seo:hover{border-color:var(--amber);background:rgba(255,165,0,.08)}
.task-with-seo{border-left:2px solid var(--amber)}
.task-ac-seo{color:var(--amber)!important;font-style:italic;border-top:1px dashed var(--border);padding-top:6px!important;margin-top:6px}
/* devlog seo tag */
.log-seo .log-title{color:var(--amber)}
.log-mag{margin-right:4px}
.log-tag-seo{background:rgba(255,165,0,.12)!important;color:var(--amber)!important;border-color:rgba(255,165,0,.35)!important}
</style></head>
<body>
<div class="grain"></div>
<div class="topnav"><div class="inner">
  <a class="brand" href="#/">${brandLockup}</a>
  <a class="nav" href="#/" data-nav="/">Overview</a>
  ${hasArch?`<a class="nav" href="#/arch" data-nav="/arch">${esc((D.architecture && D.architecture.navLabel) || 'Architecture')}</a>`:''}
  ${hasSecurity?`<a class="nav" href="#/security" data-nav="/security">🛡 Security</a>`:''}
  ${hasSeo?`<a class="nav" href="#/seo" data-nav="/seo">🔎 SEO</a>`:''}
  <span class="spacer"></span>
  ${D.project.updated?`<span class="nav" style="color:var(--muted)">${esc(D.project.updated)}</span>`:''}
</div></div>
<div class="wrap">
${views.join('\n')}
<footer>Living atlas for <b>${esc(D.project.name)}</b> · edit <code>${esc(inputFileLabel)}</code> &rarr; <code>bb-atlas generate</code> &rarr; refresh<br>Generated ${new Date().toISOString().slice(0,16).replace('T',' ')}${sprintsList.length?` · ${sprintsList.length} sprints`:''}${archModules.length?` · ${archModules.length} modules`:''}${sprintsList.length?` · ${sprintsList.reduce((a,s)=>a+(s.tasks||[]).length,0)} tasks`:''}${hasSecurity?` · ${secThreats.length} threats · ${secMitigations.length} mitigations`:''}${hasSeo?` · ${seoFindings.length} SEO finding${seoFindings.length===1?'':'s'}`:''}${hasSim?' · sim runs in-browser':''}<br>Built with <b style="color:var(--cyan)">Byte Bridges Atlas</b> · reusable living-doc generator</footer>
</div>
<script>
const SIM=${hasSim?JSON.stringify(D.simulation):'null'},RISKS=${JSON.stringify(risksList)};
function router(){
  let h=location.hash.replace(/^#/,'')||'/';
  if(h==='')h='/';
  let view=[...document.querySelectorAll('.view')].find(v=>v.dataset.route===h);
  if(!view)view=document.querySelector('.view[data-route="/"]');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  view.classList.add('active');
  document.querySelectorAll('.topnav a.nav').forEach(a=>a.classList.toggle('active',a.dataset.nav===view.dataset.route));
  window.scrollTo({top:0,behavior:'instant'});
  if(view.dataset.route==='/'&&SIM)runSim();
}
window.addEventListener('hashchange',router);
function gauss(m,s){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return m+s*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function runSim(){
  if(!SIM)return;
  const c=document.getElementById('simCanvas');if(!c)return;
  const res=[];
  for(let i=0;i<SIM.runs;i++){let pts=0,sp=0;while(pts<SIM.totalPoints&&sp<40){pts+=Math.max(6,gauss(SIM.velocityMean,SIM.velocityStd));sp++;}
    let wk=sp*SIM.sprintWeeks;for(const r of RISKS){if(typeof r.prob==='number'&&Math.random()<r.prob)wk+=(r.delayWeeks||0);}res.push(wk);}
  res.sort((a,b)=>a-b);const pct=p=>res[Math.floor(p*res.length)];
  const p50=pct(.5),p80=pct(.8),p90=pct(.9);
  document.getElementById('p50').textContent=String(Math.round(p50));
  document.getElementById('p80').textContent=String(Math.round(p80));
  document.getElementById('p90').textContent=String(Math.round(p90));
  document.getElementById('simCaption').textContent=SIM.note+' — '+SIM.runs.toLocaleString()+' runs · '+SIM.totalPoints+' pts · velocity '+SIM.velocityMean+'±'+SIM.velocityStd+'.';
  drawHist(res,p50,p80,p90);
}
function drawHist(data,p50,p80,p90){
  const c=document.getElementById('simCanvas'),dpr=window.devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;
  c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);x.clearRect(0,0,w,h);
  const min=Math.floor(data[0]),max=Math.ceil(data[data.length-1]),bins=Math.max(8,max-min),counts=new Array(bins).fill(0);
  data.forEach(v=>{let b=Math.min(bins-1,Math.floor((v-min)/(max-min)*bins));counts[b]++;});
  const peak=Math.max(...counts),bw=w/bins,css=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  for(let i=0;i<bins;i++){const bh=(counts[i]/peak)*(h-30),wk=min+(i/bins)*(max-min);let col=css('--cyan');if(wk>p80)col=css('--amber');if(wk>p90)col=css('--red');
    const g=x.createLinearGradient(0,h-bh,0,h);g.addColorStop(0,col);g.addColorStop(1,col+'22');x.fillStyle=g;x.fillRect(i*bw+1,h-bh-18,bw-2,bh);}
  x.fillStyle=css('--muted');x.font='10px IBM Plex Mono';x.textAlign='center';
  for(let i=0;i<=4;i++){const wk=Math.round(min+(i/4)*(max-min));x.fillText('W'+wk,(i/4)*w,h-3);}
  [{v:p50,c:css('--cyan')},{v:p80,c:css('--amber')},{v:p90,c:css('--red')}].forEach(m=>{const px=((m.v-min)/(max-min))*w;x.strokeStyle=m.c;x.lineWidth=1.5;x.setLineDash([4,3]);x.beginPath();x.moveTo(px,0);x.lineTo(px,h-18);x.stroke();x.setLineDash([]);});
}
router();
window.addEventListener('resize',()=>{if(SIM&&document.querySelector('.view[data-route="/"]').classList.contains('active'))runSim();});
// security view toggle
document.querySelectorAll('.sec-tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const tab=btn.dataset.tab;
    document.querySelectorAll('.sec-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    document.querySelectorAll('.sec-pane').forEach(p=>p.classList.toggle('active',p.classList.contains('sec-pane-'+tab)));
  });
});
// seo view toggle
document.querySelectorAll('.seo-tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const tab=btn.dataset.tab;
    document.querySelectorAll('.seo-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    document.querySelectorAll('.seo-pane').forEach(p=>p.classList.toggle('active',p.classList.contains('seo-pane-'+tab)));
  });
});
</script>
</body></html>
`;

  return { html, viewCount: views.length };
}

function generate({ dataPath, outPath }) {
  const D = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const resolvedOut = outPath
    || (D.output ? path.resolve(path.dirname(dataPath), D.output) : path.join(path.dirname(dataPath), 'index.html'));
  const { html, viewCount } = generateString(D, dataPath);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
  fs.writeFileSync(resolvedOut, html);
  return { outPath: resolvedOut, sizeBytes: Buffer.byteLength(html), viewCount };
}

module.exports = { generate, generateString };

// Allow `node lib/generate.js <input> <output>` for backward compat.
if (require.main === module) {
  const dataPath = process.argv[2] || path.join(process.cwd(), 'project.json');
  const outPath = process.argv[3] || null;
  try {
    const { outPath: out, sizeBytes, viewCount } = generate({ dataPath, outPath });
    console.log(`✓ Generated ${out} (${(sizeBytes/1024).toFixed(1)} KB · ${viewCount} views)`);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
