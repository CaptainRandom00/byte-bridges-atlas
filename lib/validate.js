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

  return { errors, warnings };
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
