// Caritas para los guiños. Cada una tiene su animación grande.
export const CARITAS = [
  { e: '😂', label: 'Risa',   anim: 'emojiTada' },
  { e: '😍', label: 'Amor',   anim: 'emojiPulse' },
  { e: '😎', label: 'Cool',   anim: 'emojiBounce' },
  { e: '🤡', label: 'Payaso', anim: 'emojiSpin' },
  { e: '😱', label: 'Shock',  anim: 'emojiShake' },
  { e: '🔥', label: 'Fuego',  anim: 'emojiBounce' },
  { e: '💀', label: 'Savage', anim: 'emojiSpin' },
  { e: '👑', label: 'Crack',  anim: 'emojiPulse' },
  { e: '🤣', label: 'Burla',  anim: 'emojiShake' },
  { e: '😭', label: 'Llanto', anim: 'emojiBounce' },
];

export const caritaAnim = (emoji) =>
  CARITAS.find((c) => c.e === emoji)?.anim || 'emojiTada';

// GIFs para elegir (links directos)
export const GIFS = [
  { url: 'https://media.tenor.com/xqhHM6bEigUAAAAM/frustrating-work.gif', label: 'Frustración' },
  { url: 'https://media.tenor.com/isxtghQqQDQAAAAM/waiting-bored.gif',    label: 'Esperando' },
  { url: 'https://i.pinimg.com/originals/0c/f1/ef/0cf1efc81c39849dc98e35325d26967c.gif', label: 'No puede ser' },
  { url: 'https://media.tenor.com/-aELdZR5cMAAAAAM/gior-geshem.gif',      label: 'Nervioso' },
  { url: 'https://i.pinimg.com/originals/59/ef/14/59ef1489b4b1466d2bec8f62a12b3333.gif', label: 'Noooo' },
  { url: 'https://i.pinimg.com/originals/0f/d9/7b/0fd97b2454b20a0fee72080787bccfdf.gif', label: 'Alegría' },
  { url: 'https://usagif.com/wp-content/uploads/happy-person-26.gif',     label: 'Felicidad' },
  { url: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHUxd2o1NGJicDl1OGV5MWJkYzZuOXd5Y2JmNmZ6cmcwdmp3aXJ6aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TjqLxz8hvCyRCUFoGo/giphy.gif', label: 'Te estoy viendo' },
  { url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ3ZnhyMjQzdHJncnB4MHlqem5uc2Uwamc3YzlqMzg5Z2cwdWV5ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/HulrUF6sC8YiaPUxKS/giphy.gif', label: 'Te estoy viendo 2' },
  { url: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzBnY3U5MXJsYjNvMXg4cGhsamhyN284N2JhaWdhdjQ2YjFpdHlzYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/P5AGXvRzq1MWY/giphy.gif', label: 'No me has visto' },
  { url: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2tmdHp1bDdva3JkZWhja241NWVtbWt0MjZrbTZscWl6NjFnZ2gwOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/jnDIy62fjoYaemV9jO/giphy.gif', label: 'Ya es viernes' },
  { url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXJnMmZsYzA4emsxaGdqa3gwcHJjeXp0aHpkZWFyeGEyb2I5YmtuMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kgCFd0jv5DE1785BrY/giphy.gif', label: 'Me rindo' },
  { url: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdjA4Nnh4bzF4M2Y1a3VvbDQyd20xNWpmNHhrb3pmYjFlMW02ajI0dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/p37Fr6zjkavza2DaXW/giphy.gif', label: 'Qué sueño' },
  { url: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcnVmM2RmOXE2MHR0MG1sM2s5M3hudG5icjdvcWx5bTNjZjUyaGEzNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OgIpz3EJWlhD5xRVhm/giphy.gif', label: 'Ponte a trabajar' },
  { url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExenVrNXlyM2N4ZmMxN2MxemgzNDI4MXJiejVuNGtpZzM5eDcxNm15aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/btbUGSHh3f6eBjbDfh/giphy.gif', label: 'Reacción' },
  { url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOW5zN2p5bzF5N3N6dWJnazZrcW04MzFoYzQwNXl2N203Zno0dWc4dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9UgsvgsDQALcs/giphy.gif', label: 'Ja ja' },
  { url: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeW9pZHZ1Ym5sbjA0a25sa3A4NnFvbWJ1YWVodG4zeW04dXZhMHJ0ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9zrrNcVCqnFNm/giphy.gif', label: 'No sé qué decir' },
  { url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXdrZzk0ZXdsMjcyM2V5aHdpZDV3djcwamRhbjh1OTB0MTNjeXhpciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZZiLDJ98R2GOY/giphy.gif', label: 'Eres el mejor' },
  { url: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNDk5amoybTg4YTRucnA1amZ5Y3Y3b2gyOWlqd2VmaWMycHBpMzI2YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tjlhjeGor1HV0tEiGB/giphy.gif', label: '¿Sabes trabajar?' },
  { url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGVwdWg0cWhvYTBpMHJpZzBtdWlrN3BvbmlsMGR4emZ5ZXRoZjB1MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/X3m0FOeZPe3z4jfzE6/giphy.gif', label: 'De vuelta al trabajo' },
  { url: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnEzYmpuYWJqY2kxZ3dvajM0cjNuNjdla3J3d2V1MXNyZ2c4M3NwbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ThrM4jEi2lBxd7X2yz/giphy.gif', label: 'No sé qué hacer' },
  { url: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHlwdWZkbThld2R6MG5va3NhZmxobWJ3ZHNqZ3FnaHg4anNocjhkNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/60yTQLK9O7XlS/giphy.gif', label: 'Llorando en silencio' },
  { url: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXM5bHBvMHE0MnozY3ZibnQ3N3U0bjgyMTZkYzNzNGJqNjZheXlzbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9rJWu5pKI2Gn02ENjd/giphy.gif', label: 'A full en el trabajo' },
  { url: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWtscHE0c2o0ZHRjOGIyNzhxcTV3OHBsZWtiOTRncDZiM2Vlamw3NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d5mI2F3MxCTJu/giphy.gif', label: 'Tengo sueño' },
  { url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjZsbmh2cWwzNnhpMDJ6NmN5MmxkdjA2ZnQyaXJjMjE3NjN0eDN3dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LTYT5GTIiAMBa/giphy.gif', label: 'Aburrido' },
  { url: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzk3MXY0YzF3d3IyN3R0c2x5MDBubm80d21pejZxM2Jlc3hxazFvMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TSVTlZqG4NJAs/giphy.gif', label: 'Me caigo del sueño' },
  { url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWJpMmM5bWZyM2hpOXdkOHE5cXdrMWtxYXQwNDRzODc1dWk0cTkzNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3rgXBxX4myufzT6N2w/giphy.gif', label: 'Qué alegría' },
  { url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExb3QwbWt2enJmbWhtazlqenpoaDgxeG8wczIxa29jMXFyemRxY2V3dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/nDSlfqf0gn5g4/giphy.gif', label: 'Di que sí' },
  { url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDJ6bHI3ZWp1cDE0Z3FkMDh2c2JsZHRoM24zNWIwZTNodHJrZjZrYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Mr5yS9nR4kAda/giphy.gif', label: 'Estamos pensando lo mismo' },
];
