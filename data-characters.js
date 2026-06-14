// ============================================================
// LIFE MANUAL — 19 GUIDE CHARACTERS
// ------------------------------------------------------------
// Each guide shows its PNG from  characters/<id>.png
// Until a PNG exists, the emoji is shown automatically.
// Drop transparent-background PNGs in the characters/ folder,
// named exactly by the id below (e.g. characters/elephant.png).
// ============================================================
const CHARACTERS = [
  // The mascot / all-in-one guide (default)
  {id:"elephant", name:"Manny",  animal:"Elephant", emoji:"🐘", pillar:"Your all-in-one guide", goal:"",            color:"#a78bfa", accent:"#7c3aed", voice:"warm, wise, steady", hello:"I carry the whole manual for you."},

  {id:"beaver",   name:"Buck",   animal:"Beaver",   emoji:"🦫", pillar:"Money & saving",        goal:"money",        color:"#b45309", accent:"#92400e", voice:"practical, frugal, encouraging", hello:"Let's build your safety net, coin by coin."},
  {id:"panda",    name:"Bo",     animal:"Panda",    emoji:"🐼", pillar:"Food & nutrition",      goal:"health",       color:"#10b981", accent:"#059669", voice:"nourishing, cheerful", hello:"Good food, good mood — I'll show you how."},
  {id:"wolf",     name:"Coach",  animal:"Wolf",     emoji:"🐺", pillar:"Fitness & body",        goal:"health",       color:"#3b82f6", accent:"#1d4ed8", voice:"energetic, motivating", hello:"Let's get that body moving today!"},
  {id:"bear",     name:"Barney", animal:"Bear",     emoji:"🐻", pillar:"Rest & sleep",          goal:"healing",      color:"#7dd3fc", accent:"#38bdf8", voice:"gentle, soothing", hello:"Rest is part of the work. I've got you."},
  {id:"capybara", name:"Cappy",  animal:"Capybara", emoji:"🦫", pillar:"Calm & self-care",      goal:"healing",      color:"#d4a373", accent:"#a17c5b", voice:"unbothered, calming", hello:"Slow breath. We take life one cozy step at a time."},
  {id:"cat",      name:"Momo",   animal:"Cat",      emoji:"🐱", pillar:"Focus & mind",          goal:"habits",       color:"#2dd4bf", accent:"#14b8a6", voice:"quiet, intentional", hello:"One thing at a time. Let's find your focus."},
  {id:"penguin",  name:"Ms. Pippy", animal:"Penguin", emoji:"🐧", pillar:"Learning & study",   goal:"habits",       color:"#16a34a", accent:"#15803d", voice:"patient, teacherly", hello:"Class is in session — and you're going to do great."},
  {id:"owl",      name:"Otto",   animal:"Owl",      emoji:"🦉", pillar:"Knowledge & curiosity", goal:"habits",       color:"#a16207", accent:"#854d0e", voice:"thoughtful, scholarly", hello:"So much to discover. Let's learn something today."},
  {id:"bunny",    name:"Penny",  animal:"Bunny",    emoji:"🐰", pillar:"Planning & schedule",   goal:"habits",       color:"#f9a8d4", accent:"#ec4899", voice:"organized, upbeat", hello:"Let's map out your day so nothing slips."},
  {id:"ant",      name:"Andy",   animal:"Ant",      emoji:"🐜", pillar:"Daily habits",          goal:"habits",       color:"#14b8a6", accent:"#0d9488", voice:"consistent, no-nonsense friendly", hello:"Small steps, every day. That's how it's done."},
  {id:"dolphin",  name:"Finn",   animal:"Dolphin",  emoji:"🐬", pillar:"Talking & connection",  goal:"relationships",color:"#3b82f6", accent:"#1e40af", voice:"warm, social, kind", hello:"Connection is a skill. I'll help you say it right."},
  {id:"lion",     name:"Leo",    animal:"Lion",     emoji:"🦁", pillar:"Confidence & courage",  goal:"confidence",   color:"#f59e0b", accent:"#d97706", voice:"bold, uplifting", hello:"You're braver than you think. Let's prove it."},
  {id:"fox",      name:"Rusty",  animal:"Fox",      emoji:"🦊", pillar:"Creativity & ideas",    goal:"confidence",   color:"#fb923c", accent:"#ea580c", voice:"playful, imaginative", hello:"Got a spark? Let's turn it into something."},
  {id:"deer",     name:"Fern",   animal:"Deer",     emoji:"🦌", pillar:"Growth & fresh starts", goal:"habits",       color:"#c08552", accent:"#9c6644", voice:"gentle, hopeful", hello:"Every day you grow a little. Let's walk."},
  {id:"turtle",   name:"Sage",   animal:"Turtle",   emoji:"🐢", pillar:"Wisdom & patience",     goal:"healing",      color:"#84a98c", accent:"#588157", voice:"slow, wise, reassuring", hello:"Slow and steady. The good things take time."},
  {id:"eagle",    name:"Vera",   animal:"Eagle",    emoji:"🦅", pillar:"Leadership & vision",   goal:"confidence",   color:"#3b5b8c", accent:"#1e40af", voice:"visionary, responsible", hello:"See the bigger picture. Let's lead your life."},
  {id:"tiger",    name:"Theo",   animal:"Tiger",    emoji:"🐯", pillar:"Bravery & adventure",   goal:"confidence",   color:"#ea580c", accent:"#c2410c", voice:"fearless, fun", hello:"Adventure's calling — let's go be brave!"},
  {id:"raccoon",  name:"Rocky",  animal:"Raccoon",  emoji:"🦝", pillar:"Tech & digital life",   goal:"habits",       color:"#475569", accent:"#334155", voice:"clever, helpful", hello:"Screens, scams, settings — I'll make tech easy."}
];
