/**
 * BB Atlas — validate subcommand
 *
 * Lints a project.json against the schema without generating.
 * Returns { errors: [], warnings: [] }.
 */
const fs = require('fs');

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function isArr(v) { return Array.isArray(v); }
function isStr(v) { return typeof v === 'string'; }

function validateData(D) {
  const errors = [];
  const warnings = [];

  if (!isObj(D)) { errors.push('top-level JSON must be an object'); return { errors, warnings }; }

  if (!isObj(D.project)) errors.push('`project` is required and must be an object');
  else {
    if (!isStr(D.project.name)) errors.push('`project.name` is required (string)');
    if (!isStr(D.project.tagline)) warnings.push('`project.tagline` missing — header will look empty');
  }

  if (D.metrics !== undefined) {
    if (!isArr(D.metrics)) errors.push('`metrics` must be an array');
    else D.metrics.forEach((m, i) => {
      if (!isObj(m)) errors.push(`metrics[${i}] must be an object {label, value, unit}`);
      else ['label', 'value', 'unit'].forEach(k => { if (m[k] === undefined) warnings.push(`metrics[${i}].${k} missing`); });
    });
  }

  if (D.roadmap !== undefined) {
    if (!isObj(D.roadmap)) errors.push('`roadmap` must be an object {now[], next[], later[]}');
    else ['now', 'next', 'later'].forEach(col => {
      if (D.roadmap[col] !== undefined && !isArr(D.roadmap[col])) errors.push(`roadmap.${col} must be an array`);
    });
  }

  if (D.sprints !== undefined) {
    if (!isArr(D.sprints)) errors.push('`sprints` must be an array');
    else D.sprints.forEach((s, i) => {
      if (!isObj(s)) errors.push(`sprints[${i}] must be an object`);
      else {
        if (typeof s.id !== 'number') errors.push(`sprints[${i}].id must be a number`);
        if (!isArr(s.weeks) || s.weeks.length !== 2) errors.push(`sprints[${i}].weeks must be [start, end]`);
      }
    });
  }

  if (D.architecture !== undefined) {
    if (!isObj(D.architecture)) errors.push('`architecture` must be an object');
    else {
      if (D.architecture.modules !== undefined && !isArr(D.architecture.modules)) errors.push('architecture.modules must be an array');
      if (D.architecture.dataModel !== undefined && !isArr(D.architecture.dataModel)) errors.push('architecture.dataModel must be an array');
      (D.architecture.modules || []).forEach((m, i) => {
        if (!isObj(m)) errors.push(`architecture.modules[${i}] must be an object`);
        else if (!isStr(m.id)) errors.push(`architecture.modules[${i}].id is required (string)`);
      });
    }
  }

  if (D.risks !== undefined && !isArr(D.risks)) errors.push('`risks` must be an array');
  if (D.devlog !== undefined && !isArr(D.devlog)) errors.push('`devlog` must be an array');
  if (D.milestones !== undefined && !isArr(D.milestones)) errors.push('`milestones` must be an array');
  if (D.pricing !== undefined && !isObj(D.pricing)) errors.push('`pricing` must be an object');
  if (D.simulation !== undefined && !isObj(D.simulation)) errors.push('`simulation` must be an object');

  if (D.simulation && (!D.sprints || !D.sprints.length)) warnings.push('`simulation` is set but no `sprints` — Monte Carlo widget will be skipped');

  validateSecurity(D, errors, warnings);

  return { errors, warnings };
}

const SEVERITY_VALUES = ['low', 'med', 'high'];
const STATUS_VALUES   = ['planned', 'in-progress', 'verified', 'dropped'];

function validateSecurity(D, errors, warnings) {
  if (D.security === undefined) return;
  if (!isObj(D.security)) { errors.push('`security` must be an object'); return; }

  const S = D.security;

  if (S.principles !== undefined) {
    if (!isArr(S.principles)) errors.push('`security.principles` must be an array');
    else S.principles.forEach((p, i) => {
      if (!isObj(p)) errors.push(`security.principles[${i}] must be an object`);
      else if (!isStr(p.id)) warnings.push(`security.principles[${i}].id missing — recommended (e.g. SP-001)`);
    });
  }

  const threatIds = new Set();
  if (S.threats !== undefined) {
    if (!isArr(S.threats)) errors.push('`security.threats` must be an array');
    else S.threats.forEach((t, i) => {
      if (!isObj(t)) { errors.push(`security.threats[${i}] must be an object`); return; }
      if (!isStr(t.id)) errors.push(`security.threats[${i}].id is required (string, e.g. T-001)`);
      else threatIds.add(t.id);
      if (t.severity !== undefined && !SEVERITY_VALUES.includes(t.severity))
        errors.push(`security.threats[${i}].severity must be one of ${SEVERITY_VALUES.join(', ')}`);
      if (t.likelihood !== undefined && (typeof t.likelihood !== 'number' || t.likelihood < 0 || t.likelihood > 1))
        errors.push(`security.threats[${i}].likelihood must be a number in [0, 1]`);
      if (t.appliesTo !== undefined && !isArr(t.appliesTo))
        errors.push(`security.threats[${i}].appliesTo must be an array of module IDs`);
      if (t.mitigations !== undefined && !isArr(t.mitigations))
        errors.push(`security.threats[${i}].mitigations must be an array of mitigation IDs`);
    });
  }

  const mitigationIds = new Set();
  if (S.mitigations !== undefined) {
    if (!isArr(S.mitigations)) errors.push('`security.mitigations` must be an array');
    else S.mitigations.forEach((m, i) => {
      if (!isObj(m)) { errors.push(`security.mitigations[${i}] must be an object`); return; }
      if (!isStr(m.id)) errors.push(`security.mitigations[${i}].id is required (string, e.g. M-001)`);
      else mitigationIds.add(m.id);
      if (m.status !== undefined && !STATUS_VALUES.includes(m.status))
        errors.push(`security.mitigations[${i}].status must be one of ${STATUS_VALUES.join(', ')}`);
    });
  }

  if (S.compliance !== undefined && !isArr(S.compliance))
    errors.push('`security.compliance` must be an array');

  // Cross-ref warnings (don't block generation)
  const moduleIds = new Set((D.architecture && isArr(D.architecture.modules) ? D.architecture.modules : []).map(m => m.id));
  const sprintIds = new Set((isArr(D.sprints) ? D.sprints : []).map(s => s.id));

  (S.threats || []).forEach((t, i) => {
    (t.mitigations || []).forEach(mid => {
      if (!mitigationIds.has(mid)) warnings.push(`security.threats[${i}] (${t.id || '?'}) references unknown mitigation \`${mid}\``);
    });
    (t.appliesTo || []).forEach(mid => {
      if (moduleIds.size && !moduleIds.has(mid)) warnings.push(`security.threats[${i}] (${t.id || '?'}) appliesTo unknown module \`${mid}\``);
    });
  });

  (S.mitigations || []).forEach((m, i) => {
    if (m.module && moduleIds.size && !moduleIds.has(m.module))
      warnings.push(`security.mitigations[${i}] (${m.id || '?'}) references unknown module \`${m.module}\``);
    if (m.sprint !== undefined && sprintIds.size && !sprintIds.has(m.sprint))
      warnings.push(`security.mitigations[${i}] (${m.id || '?'}) references unknown sprint \`${m.sprint}\``);
  });

  // Per-task security tags
  (isArr(D.sprints) ? D.sprints : []).forEach((s, si) => {
    (isArr(s.tasks) ? s.tasks : []).forEach((t, ti) => {
      if (t.security === undefined) return;
      if (!isObj(t.security)) { errors.push(`sprints[${si}].tasks[${ti}].security must be an object`); return; }
      if (t.security.mitigation && mitigationIds.size && !mitigationIds.has(t.security.mitigation))
        warnings.push(`sprints[${si}].tasks[${ti}].security.mitigation references unknown mitigation \`${t.security.mitigation}\``);
    });
  });

  // Per-module security posture
  (D.architecture && isArr(D.architecture.modules) ? D.architecture.modules : []).forEach((m, i) => {
    if (m.security === undefined) return;
    if (!isObj(m.security)) errors.push(`architecture.modules[${i}].security must be an object`);
  });
}

function validate(dataPath) {
  let D;
  try {
    D = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (e) {
    return { errors: [`failed to parse ${dataPath}: ${e.message}`], warnings: [] };
  }
  return validateData(D);
}

module.exports = { validate, validateData };
