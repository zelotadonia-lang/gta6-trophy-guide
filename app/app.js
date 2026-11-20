// GTA 6 Trophy Guide & Tracker: checklist saved in localStorage, kind and grade
// filters, a spoiler setting for story trophies, a roadmap to the platinum, and
// a cited guide for every trophy. Static only: it loads data/trophies.json
// from its own folder and makes no other request.
const STORE_KEY = 'gta6-trophy-guide-v1';
const KIND_LABELS = {
  all: 'All',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};
const ROADMAP = [
  { stage: 1, title: 'Play the story', text: 'Chapters 1 to 4, the named missions and the finale. Do the partner trophies here, while a partner is at your side.' },
  { stage: 2, title: 'Strangers and side strands', text: 'Mission strands for Andy, Kenton, Billy, Randy and Tyrone, plus Bret\u2019s hunt, until 8 strands are done.' },
  { stage: 3, title: 'Activities and combat', text: 'Races, shooting range golds, stunts, heists, robberies and the one-off events. Most of the list lives here.' },
  { stage: 4, title: 'Collectibles, money and map', text: 'Cards, WAiNK It spots, meditation spots, vehicles, full map coverage, laundered bills and garages.' },
  { stage: 5, title: 'Platinum cleanup', text: '100% completion first, then the platinum pops with the last trophy you need.' },
];

const params = new URLSearchParams(location.search);
const demoEarned = new Set(
  (params.get('demo') ?? '').split(',').map((s) => Number(s)).filter((n) => n > 0),
);

const stored = loadStored();
const state = {
  earned: new Set(stored.earned),
  spoiler: stored.spoiler,
  kind: params.get('filter') && KIND_LABELS[params.get('filter')] ? params.get('filter') : 'all',
  grade: ['all', 'platinum', 'gold', 'silver', 'bronze'].includes(params.get('grade'))
    ? params.get('grade')
    : 'all',
  search: '',
  openGuide: params.get('open') ? Number(params.get('open')) : null,
};
if (params.get('spoiler') === 'on') state.spoiler = true;
if (params.get('spoiler') === 'off') state.spoiler = false;

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const isEarned = (t) => state.earned.has(t.name) || demoEarned.has(t.id);

const listEl = document.getElementById('trophies');
const noteEl = document.getElementById('list-note');
const emptyEl = document.getElementById('empty');
const stagesEl = document.getElementById('stages');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');

function loadStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
    return {
      earned: Array.isArray(raw.earned) ? raw.earned.filter((n) => typeof n === 'string') : [],
      spoiler: raw.spoiler === true,
    };
  } catch {
    return { earned: [], spoiler: false };
  }
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify({ earned: [...state.earned], spoiler: state.spoiler }));
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function isHiddenBySpoiler(t) {
  return state.spoiler && t.kind === 'story' && !isEarned(t);
}

function visibleTrophies() {
  const q = state.search.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.kind === 'missable' && !t.missable) return false;
    if (state.kind === 'online') return false;
    if (state.kind !== 'all' && state.kind !== 'missable' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderProgress() {
  const total = trophies.length;
  const earnedCount = trophies.filter(isEarned).length;
  const pct = Math.round((earnedCount / total) * 100);
  document.getElementById('progress-count').textContent = `${earnedCount} of ${total} earned`;
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('toolbar-progress').textContent = `${earnedCount}/${total} earned \u00b7 ${pct}%`;
  document.getElementById('progress-fill').style.width = `${pct}%`;
  const byGrade = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const inGrade = trophies.filter((t) => t.grade === g);
    const done = inGrade.filter(isEarned).length;
    return `${done}/${inGrade.length} ${gradeLabel(g)}`;
  });
  document.getElementById('progress-grades').textContent =
    `${byGrade.join(' \u00b7 ')} \u00b7 ${trophies.filter((t) => t.missable && isEarned(t)).length}/${trophies.filter((t) => t.missable).length} missable`;
}

function renderRoadmap() {
  stagesEl.replaceChildren();
  for (const step of ROADMAP) {
    const members = trophies.filter((t) => t.roadmap_stage === step.stage);
    const done = members.filter(isEarned).length;
    const li = document.createElement('li');
    li.className = 'stage';
    const h = document.createElement('h3');
    const num = document.createElement('span');
    num.className = 'step';
    num.textContent = `Stage ${step.stage}`;
    h.append(num, document.createTextNode(step.title));
    const p = document.createElement('p');
    p.textContent = step.text;
    const count = document.createElement('p');
    count.className = 'stage-count';
    count.textContent = `${done} of ${members.length} earned`;
    const ul = document.createElement('ul');
    for (const t of members) {
      const item = document.createElement('li');
      if (isEarned(t)) item.className = 'earned';
      item.textContent = isHiddenBySpoiler(t) ? 'Hidden trophy' : t.name;
      ul.append(item);
    }
    li.append(h, p, count, ul);
    stagesEl.append(li);
  }
}

function trophyCard(t) {
  const li = document.createElement('li');
  li.className = 'trophy' + (isEarned(t) ? ' earned' : '');
  li.id = `trophy-${t.id}`;
  const hidden = isHiddenBySpoiler(t);

  const head = document.createElement('div');
  head.className = 'trophy-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned(t);
  box.setAttribute('aria-label', `Mark ${hidden ? 'this hidden trophy' : t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) state.earned.add(t.name);
    else state.earned.delete(t.name);
    save();
    renderAll();
  });

  const main = document.createElement('div');
  main.className = 'trophy-main';
  const name = document.createElement('h3');
  name.className = 'trophy-name';
  if (hidden) {
    const span = document.createElement('span');
    span.className = 'hidden-name';
    span.textContent = 'Hidden trophy \u2014 earn it to reveal the name';
    name.append(span);
  } else {
    name.textContent = t.name;
  }
  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = hidden ? 'Spoiler setting is on. Tick the box when you earn it.' : t.description;

  const badges = document.createElement('div');
  badges.className = 'badges';
  const grade = document.createElement('span');
  grade.className = `badge ${t.grade}`;
  grade.textContent = gradeLabel(t.grade);
  badges.append(grade);
  const kind = document.createElement('span');
  kind.className = `badge kind-${t.kind}`;
  kind.textContent = KIND_LABELS[t.kind] ?? t.kind;
  badges.append(kind);
  const stage = document.createElement('span');
  stage.className = 'badge';
  stage.textContent = `Roadmap stage ${t.roadmap_stage}`;
  badges.append(stage);
  if (t.missable) {
    const flag = document.createElement('span');
    flag.className = 'badge missable';
    flag.textContent = 'Missable';
    badges.append(flag);
  }
  main.append(name, desc, badges);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  const open = state.openGuide === t.id;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'Hide guide' : 'Show guide';
  toggle.addEventListener('click', () => {
    state.openGuide = state.openGuide === t.id ? null : t.id;
    renderAll();
  });
  head.append(box, main, toggle);
  li.append(head);

  if (open) {
    const guide = document.createElement('div');
    guide.className = 'guide';
    const text = document.createElement('p');
    text.textContent = hidden ? 'The guide stays hidden with the trophy. Earn it first.' : t.guide;
    guide.append(text);
    if (!hidden) {
      const src = document.createElement('p');
      src.className = 'source';
      src.textContent = `Source: ${t.source}`;
      guide.append(src);
    }
    li.append(guide);
  }
  return li;
}

function renderList() {
  const shown = visibleTrophies();
  listEl.replaceChildren(...shown.map(trophyCard));
  const earnedShown = shown.filter(isEarned).length;
  noteEl.textContent =
    `Showing ${shown.length} of ${trophies.length} trophies \u00b7 ${earnedShown} earned in this view` +
    (state.kind === 'online' ? ' \u00b7 The official list holds no online trophies.' : '');
  emptyEl.hidden = shown.length > 0;
}

function renderFilters() {
  const wrap = document.getElementById('kind-filters');
  wrap.replaceChildren();
  for (const [key, label] of Object.entries(KIND_LABELS)) {
    const count = key === 'all'
      ? trophies.length
      : key === 'missable'
        ? trophies.filter((t) => t.missable).length
        : key === 'online'
          ? 0
          : trophies.filter((t) => t.kind === key).length;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.setAttribute('aria-pressed', String(state.kind === key));
    chip.textContent = `${label} (${count})`;
    chip.addEventListener('click', () => {
      state.kind = key;
      renderAll();
    });
    wrap.append(chip);
  }
  gradeEl.value = state.grade;
  spoilerEl.checked = state.spoiler;
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderFilters();
  renderList();
}

searchEl.addEventListener('input', () => {
  state.search = searchEl.value;
  renderList();
});
gradeEl.addEventListener('change', () => {
  state.grade = gradeEl.value;
  renderAll();
});
spoilerEl.addEventListener('change', () => {
  state.spoiler = spoilerEl.checked;
  save();
  renderAll();
});
document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify({ earned: [...state.earned], spoiler: state.spoiler }, null, 2)], { type: 'application/json' }),
  );
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = new Set(trophies.map((t) => t.name));
    state.earned = new Set((Array.isArray(data.earned) ? data.earned : []).filter((n) => names.has(n)));
    if (typeof data.spoiler === 'boolean') state.spoiler = data.spoiler;
    save();
  } catch {
    alert('That file is not a valid progress export.');
  }
  e.target.value = '';
  renderAll();
});

renderAll();
if (params.get('view') === 'roadmap') {
  document.getElementById('roadmap').scrollIntoView({ behavior: 'instant', block: 'start' });
} else if (state.openGuide && byId.has(state.openGuide)) {
  document.getElementById(`trophy-${state.openGuide}`)?.scrollIntoView({ behavior: 'instant', block: 'start' });
}
