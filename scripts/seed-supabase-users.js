/**
 * Crea todos los usuarios de Andersen Ecuador en Supabase Auth + public.users.
 * Contraseña por defecto: Mundial2026
 *
 * Cómo obtener el SERVICE_ROLE_KEY:
 *   Dashboard Supabase → Project Settings → API → service_role (secret)
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx node scripts/seed-supabase-users.js
 */

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const DEFAULT_PASSWORD = 'Mundial2026';

const EMPLOYEE_MAILS = [
  'raissa.aguila@ec.andersen.com','sandy.alava@ec.andersen.com','saray.aleman@ec.andersen.com',
  'ingrid.almeida@ec.andersen.com','cristina.altamirano@ec.andersen.com','yajaira.alvarado@ec.andersen.com',
  'britney.alvarez@ec.andersen.com','juan.alvarez@ec.andersen.com','luis.andrade@ec.andersen.com',
  'zoila.andrade@ec.andersen.com','abraham.anzules@ec.andersen.com','ana.aponte@ec.andersen.com',
  'ambar.aragundy@ec.andersen.com','adriana.arcos@ec.andersen.com','vanessa.arguello@ec.andersen.com',
  'nohelia.arreaga@ec.andersen.com','kristel.arriaga@ec.andersen.com','diana.bajana@ec.andersen.com',
  'domenica.baldeon@ec.andersen.com','daniela.banegas@ec.andersen.com','dante.bardellini@ec.andersen.com',
  'leandro.barona@ec.andersen.com','aurelio.barreto@ec.andersen.com','emilio.bazurto@ec.andersen.com',
  'beatriz.bolanos@ec.andersen.com','raul.bolanos@ec.andersen.com','marlon.bonilla@ec.andersen.com',
  'joselin.borja@ec.andersen.com','francisco.briones@ec.andersen.com','gabriela.burgos@ec.andersen.com',
  'alfredo.bustos@ec.andersen.com','daniel.bustos@ec.andersen.com','mercedes.calderon@ec.andersen.com',
  'hector.calderon@ec.andersen.com','milena.canote@ec.andersen.com','sofia.carranza@ec.andersen.com',
  'christian.castro@ec.andersen.com','kevin.castro@ec.andersen.com','adrian.cercado@ec.andersen.com',
  'noemi.cevallos@ec.andersen.com','johnny.chacon@ec.andersen.com','diego.chavez@ec.andersen.com',
  'indira.siongtay@ec.andersen.com','lissette.chele@ec.andersen.com','aleida.cherres@ec.andersen.com',
  'dexer.chinga@ec.andersen.com','gabriel.chiriboga@ec.andersen.com','wilson.cobo@ec.andersen.com',
  'cristhian.contreras@ec.andersen.com','jefferson.cordova@ec.andersen.com','kenya.crespin@ec.andersen.com',
  'marlon.cruz@ec.andersen.com','katherine.deloor@ec.andersen.com','fiorella.demori@ec.andersen.com',
  'josue.demera@ec.andersen.com','ashley.endara@ec.andersen.com','ivan.enriquez@ec.andersen.com',
  'luis.escudero@ec.andersen.com','gloria.fernandez@ec.andersen.com','julio.fernandez@ec.andersen.com',
  'miguel.franco@ec.andersen.com','andy.garces@ec.andersen.com','freddy.garcia@ec.andersen.com',
  'emilio.garzon@ec.andersen.com','keila.gonzabay@ec.andersen.com','paola.gonzalez@ec.andersen.com',
  'pierina.granados@ec.andersen.com','tais.guachambo@ec.andersen.com','douglas.gualpa@ec.andersen.com',
  'nayely.guaman@ec.andersen.com','jennifer.guasco@ec.andersen.com','gabriela.guerrero@ec.andersen.com',
  'dulce.guevara@ec.andersen.com','pablo.guevara@ec.andersen.com','anahi.gutierrez@ec.andersen.com',
  'jorge.heupel@ec.andersen.com','irene.holguin@ec.andersen.com','madeleine.holguin@ec.andersen.com',
  'luis.iniga@ec.andersen.com','angelica.lainez@ec.andersen.com','stephany.lara@ec.andersen.com',
  'gianpaolo.lauri@ec.andersen.com','juliana.lazaro@ec.andersen.com','hower.leon@ec.andersen.com',
  'daniel.leon@ec.andersen.com','wellington.leon@ec.andersen.com','jose.leon@ec.andersen.com',
  'fiorella.limones@ec.andersen.com','arianna.lindao@ec.andersen.com','julio.loayza@ec.andersen.com',
  'sara.lopez@ec.andersen.com','grace.lopez@ec.andersen.com','belen.luces@ec.andersen.com',
  'michelle.moran@ec.andersen.com','jeancarlos.marcillo@ec.andersen.com','joao.marcillo@ec.andersen.com',
  'romina.mariduena@ec.andersen.com','francisco.mena@ec.andersen.com','amy.mendoza@ec.andersen.com',
  'alejandro.merchan@ec.andersen.com','madelyne.meza@ec.andersen.com','jonathan.minga@ec.andersen.com',
  'azael.mite@ec.andersen.com','allisson.monar@ec.andersen.com','carlos.montiel@ec.andersen.com',
  'camila.mora@ec.andersen.com','sindy.moran@ec.andersen.com','melany.moreira@ec.andersen.com',
  'jemima.moreira@ec.andersen.com','farina.morejon@ec.andersen.com','gustavo.moreno@ec.andersen.com',
  'jhon.munoz@ec.andersen.com','abel.murillo@ec.andersen.com','marcelo.murillo@ec.andersen.com',
  'jenniffer.narvaez@ec.andersen.com','dennis.noboa@ec.andersen.com','mario.orellana@ec.andersen.com',
  'marcelo.orellana@ec.andersen.com','miguel.orozco@ec.andersen.com','adriana.paguay@ec.andersen.com',
  'amina.palacios@ec.andersen.com','andres.pardo@ec.andersen.com','gabriel.paredes@ec.andersen.com',
  'daniela.paredes@ec.andersen.com','mariana.pastor@ec.andersen.com','vicente.pazmino@ec.andersen.com',
  'daniel.penafiel@ec.andersen.com','isabel.penaherrera@ec.andersen.com','yamilet.penaherrera@ec.andersen.com',
  'aracely.pesantez@ec.andersen.com','lesny.pico@ec.andersen.com','melanny.pincay@ec.andersen.com',
  'angely.pincay@ec.andersen.com','sofia.pinduisaca@ec.andersen.com','francisco.pita@ec.andersen.com',
  'lilibeth.plaza@ec.andersen.com','judith.pluas@ec.andersen.com','alex.ponce@ec.andersen.com',
  'kevin.preciado@ec.andersen.com','isorela.puglla@ec.andersen.com','ninoska.quijano@ec.andersen.com',
  'naomy.quimis@ec.andersen.com','michelle.quinde@ec.andersen.com','marcos.quinde@ec.andersen.com',
  'johnny.quinonez@ec.andersen.com','iveth.quinto@ec.andersen.com','john.quiroz@ec.andersen.com',
  'josua.quirumbay@ec.andersen.com','diana.quishpillo@ec.andersen.com','isabella.raymond@ec.andersen.com',
  'mauricio.reyes@ec.andersen.com','alfonso.rios@ec.andersen.com','genesis.rizzo@ec.andersen.com',
  'alexis.robayo@ec.andersen.com','abraham.rodriguez@ec.andersen.com','sebastian.rodriguez@ec.andersen.com',
  'gabriela.romero@ec.andersen.com','willian.rosado@ec.andersen.com','naomy.rosas@ec.andersen.com',
  'luciana.salame@ec.andersen.com','lissette.sanchez@ec.andersen.com','denisse.sares@ec.andersen.com',
  'luis.sarmiento@ec.andersen.com','miguel.silva@ec.andersen.com','milena.soledispa@ec.andersen.com',
  'rosalinda.soriano@ec.andersen.com','karen.suarez@ec.andersen.com','samuel.suarez@ec.andersen.com',
  'ricardo.taipe@ec.andersen.com','selene.tapia@ec.andersen.com','paulina.tirsio@ec.andersen.com',
  'lady.toala@ec.andersen.com','veronica.tomala@ec.andersen.com','melanny.tomala@ec.andersen.com',
  'kevin.torres@ec.andersen.com','carlos.torres@ec.andersen.com','ruben.tubay@ec.andersen.com',
  'allan.vargas@ec.andersen.com','jose.vega@ec.andersen.com','samira.velastegui@ec.andersen.com',
  'maria.velastegui@ec.andersen.com','gabriela.verdesoto@ec.andersen.com','samantha.villacis@ec.andersen.com',
  'joffre.villegas@ec.andersen.com','joyce.villon@ec.andersen.com','erick.vitores@ec.andersen.com',
  'cindy.vivar@ec.andersen.com','roger.yagual@ec.andersen.com','briggitte.yupa@ec.andersen.com',
  'francisco.zabala@ec.andersen.com','solange.zambrano@ec.andersen.com','tonny.zambrano@ec.andersen.com',
  'belen.zambrano@ec.andersen.com','daniela.zorrilla@ec.andersen.com',
];

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

async function run() {
  let created = 0, skipped = 0, errors = 0;

  for (const email of EMPLOYEE_MAILS) {
    const normalEmail = email.toLowerCase();
    const username    = normalEmail.split('@')[0];
    const parts       = username.split('.');
    const displayName = parts.map(cap).join(' ');
    const initials    = parts.map((p) => p[0].toUpperCase()).join('').slice(0, 2);

    // Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalEmail,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already been registered') || authError.code === 'email_exists') {
        process.stdout.write('.');
        skipped++;
        continue;
      }
      console.error(`\nError creando ${email}:`, authError.message);
      errors++;
      continue;
    }

    // Insertar perfil en public.users
    const { error: profileError } = await supabase.from('users').upsert({
      id: authData.user.id,
      username,
      display_name: displayName,
      email: normalEmail,
      avatar_initials: initials,
    }, { onConflict: 'id' });

    if (profileError) {
      console.error(`\nError perfil ${email}:`, profileError.message);
      errors++;
    } else {
      process.stdout.write('+');
      created++;
    }
  }

  console.log(`\n\nListo.`);
  console.log(`  Creados:   ${created}`);
  console.log(`  Ya existían: ${skipped}`);
  console.log(`  Errores:   ${errors}`);
}

run().catch(console.error);
