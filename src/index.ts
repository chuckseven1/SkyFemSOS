import type { Helpers } from '@zedit/upf';
import type { RecordHandle } from 'xelib';

export = 0;

enum SOS_Addon_Gender {
  Male = 0,
  Female = 1,
  Both = 2,
}

type Locals = {
  addonsToPatch: string[];
};

/**
 * Overwrite the male models/textures with the female ones
 */
function patchArma(record: RecordHandle, helpers: Helpers) {
  const arma = xelib.GetWinningOverride(record);
  helpers.logMessage(`Patching ${xelib.LongName(arma)}`);

  // Meshes
  xelib.AddElementValue(
    arma,
    'Male world model\\MOD2 - Model Filename',
    xelib.GetValue(arma, 'Female world model\\MOD3 - Model Filename')
  );
  xelib.AddElementValue(
    arma,
    'Male 1st Person\\MOD4 - Model Filename',
    xelib.GetValue(arma, 'Female 1st Person\\MOD5 - Model Filename')
  );

  // Texture set
  const txst = xelib.GetLinksTo(arma, 'NAM1 - Female Skin texture');
  // TODO: Ignore unset textures?
  if (txst === 0) {
    return;
  }
  xelib.AddElement(arma, 'NAM0 - Male Skin Texture');
  xelib.SetLinksTo(arma, txst, 'NAM0 - Male Skin Texture');
}

registerPatcher<Locals>({
  info: info,
  gameModes: [xelib.gmSSE, xelib.gmTES5],
  settings: {
    label: 'zFem Patcher',
    templateUrl: `${patcherUrl}/partials/settings.html`,
    hide: true,
    defaultSettings: {
      // No settings
    },
  },
  requiredFiles: () => ['Schlongs of Skyrim.esp'],
  execute(_, __, ___, locals) {
    return {
      initialize() {
        locals.addonsToPatch = [];
      },
      process: [
        // Block to proccess SOS arma records
        {
          /**
           * Get all SOS ARMA records (including overrides)
           *
           * @todo feels like I'm doing this wrong
           */
          records() {
            const sos = xelib.FileByName('Schlongs of Skyrim.esp');
            return xelib.GetRecords(sos, 'ARMA', true);
          },
          patch: patchArma,
        },
        // Block to process SOS addon genders
        {
          load: {
            signature: 'GLOB',
            /**
             * Find globals for SOS addons for female and/or both
             */
            filter(record) {
              const eid = xelib.EditorID(record);

              // Ignore male only SOS addons
              // TODO: Better way to check??
              if (
                eid.startsWith('SOS_') &&
                eid.endsWith('_Gender') &&
                +xelib.GetValue(record, 'FLTV - Value') !==
                  SOS_Addon_Gender.Male
              ) {
                const addon = eid.substring(4, eid.length - 7);
                // Ignore "no futa" addon
                if (addon === 'No_Futa') {
                  return false;
                }
                locals.addonsToPatch.push(addon);
                return true;
              } else {
                return false;
              }
            },
          },
          /**
           * Set addon as usable by both males and females
           */
          patch(record) {
            const glob = xelib.GetWinningOverride(record);
            xelib.SetValue(glob, 'FLTV - Value', SOS_Addon_Gender.Both + '');
          },
        },
        // Block to process armor addons
        {
          load: {
            signature: 'ARMA',
            /**
             * Find all ARMA records of SOS addons to be patched
             */
            filter(record) {
              const eid = xelib.EditorID(record);

              // TODO: Better way to check??
              if (eid.startsWith('SOS_')) {
                return locals.addonsToPatch.some((addon) =>
                  eid.startsWith(`SOS_${addon}`)
                );
              } else {
                return false;
              }
            },
          },
          patch: patchArma,
        },
      ],
    };
  },
});
