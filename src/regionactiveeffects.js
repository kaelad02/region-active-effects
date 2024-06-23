const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { BooleanField, EmbeddedDataField, StringField } = foundry.data.fields;

Hooks.once("init", () => {
  // register the DataModel
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    "regionactiveeffects.statusEffect": StatusEffectRegionBehaviorType,
    "regionactiveeffects.activeEffect": ActiveEffectRegionBehaviorType,
  });

  // register the Sheet
  DocumentSheetConfig.registerSheet(
    RegionBehavior,
    "regionactiveeffects",
    foundry.applications.sheets.RegionBehaviorConfig,
    {
      types: ["regionactiveeffects.statusEffect"],
      makeDefault: true,
    }
  );
  DocumentSheetConfig.registerSheet(
    RegionBehavior,
    "regionactiveeffects",
    ActiveEffectRegionBehaviorConfig,
    {
      types: ["regionactiveeffects.activeEffect"],
      makeDefault: true,
    }
  );
});

/**
 * The data model for a behavior that applies a status effect while inside the Region.
 */
class StatusEffectRegionBehaviorType extends RegionBehaviorType {
  static defineSchema() {
    return {
      statusId: new StringField({
        required: true,
        blank: false,
        nullable: true,
        initial: null,
        // TODO sort choices by label
        choices: CONFIG.statusEffects.reduce((obj, statusEffect) => {
          obj[statusEffect.id] = statusEffect.name;
          return obj;
        }, {}),
        label: "RAE.TYPES.statusEffect.FIELDS.statusId.label",
        hint: "RAE.TYPES.statusEffect.FIELDS.statusId.hint",
      }),
      overlay: new BooleanField({
        initial: false,
        label: "RAE.TYPES.statusEffect.FIELDS.overlay.label",
        hint: "RAE.TYPES.statusEffect.FIELDS.overlay.hint",
      }),
    };
  }

  static async #onTokenEnter(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.statusId) return;

    // only run on triggering user
    if (!event.user.isSelf) return;

    actor.toggleStatusEffect(this.statusId, { active: true, overlay: this.overlay });
  }

  static async #onTokenExit(event) {
    // quick data verification
    const actor = event.data?.token?.actor;
    if (!actor || !this.statusId) return;

    // only run on triggering user
    if (!event.user.isSelf) return;

    actor.toggleStatusEffect(this.statusId, { active: false });
  }

  static events = {
    [CONST.REGION_EVENTS.TOKEN_ENTER]: this.#onTokenEnter,
    [CONST.REGION_EVENTS.TOKEN_EXIT]: this.#onTokenExit,
  };
}

/**
 * The data model for a behavior that applies an active effect while inside the Region.
 */
class ActiveEffectRegionBehaviorType extends RegionBehaviorType {
  static defineSchema() {
    return {
      effect: new ActiveEffectEmbeddedDataField({
        nullable: true,
        initial: null,
        label: "RAE.TYPES.activeEffect.FIELDS.effect.label",
        hint: "RAE.TYPES.activeEffect.FIELDS.effect.hint",
      }),
    };
  }

  // TODO add the events & action functions
}

class ActiveEffectEmbeddedDataField extends EmbeddedDataField {
  constructor(options, context) {
    super(foundry.documents.BaseActiveEffect, options, context);
  }

  _toInput(config) {
    const button = document.createElement("button");
    button.type = "button";
    button.name = config.name;
    button.innerText = "Edit Effect"; // TODO externalize
    button.dataset.action = "editEffect";
    foundry.applications.fields.setInputAttributes(button, config);
    return button;
  }
}

/**
 * Custom sheet to show a button for the embedded active effect.
 */
class ActiveEffectRegionBehaviorConfig extends foundry.applications.sheets.RegionBehaviorConfig {
  // add an action for the button
  static DEFAULT_OPTIONS = {
    actions: {
      editEffect: this._onEditEffect,
    },
  };

  static _onEditEffect(event, target) {
    event.stopPropagation();

    console.log("RAE edit effect button clicked", target);

    // fake Item parent
    const item = new Item({ name: "foo", type: "base" });

    // create AE document
    const cls = getDocumentClass("ActiveEffect");
    const effect = new cls({ name: "Foobar" }, { parent: item });

    // render sheet
    new RegionActiveEffectConfig(effect, { regionConfig: this, targetButton: target }).render(true);
  }

  onUpdateEffectValue(targetButton, effectValue) {
    // TODO
    console.log("RAE update button value", effectValue);
    targetButton.value = JSON.stringify(effectValue);
  }

  // unchanged, only here since addSystemFields is private
  _getFields() {
    const doc = this.document;
    const source = doc._source;
    const fields = doc.schema.fields;
    const { events, ...systemFields } = CONFIG.RegionBehavior.dataModels[doc.type]?.schema.fields;
    const fieldsets = [];

    // Identity
    fieldsets.push({
      fieldset: true,
      legend: "BEHAVIOR.SECTIONS.identity",
      fields: [{ field: fields.name, value: source.name }],
    });

    // Status
    fieldsets.push({
      fieldset: true,
      legend: "BEHAVIOR.SECTIONS.status",
      fields: [{ field: fields.disabled, value: source.disabled }],
    });

    // Subscribed events
    if (events) {
      fieldsets.push({
        fieldset: true,
        legend: "BEHAVIOR.TYPES.base.SECTIONS.events",
        fields: [{ field: events, value: source.system.events }],
      });
    }

    // Other system fields
    const sf = { fieldset: true, legend: CONFIG.RegionBehavior.typeLabels[doc.type], fields: [] };
    this.#addSystemFields(sf, systemFields, source);
    if (sf.fields.length) fieldsets.push(sf);
    return fieldsets;
  }

  // special handling for ActiveEffectEmbeddedDataField
  #addSystemFields(fieldset, schema, source, _path = "system") {
    for (const field of Object.values(schema)) {
      const path = `${_path}.${field.name}`;
      if (
        field instanceof foundry.data.fields.SchemaField &&
        !(field instanceof ActiveEffectEmbeddedDataField)
      ) {
        this.#addSystemFields(fieldset, field.fields, source, path);
      } else if (field.constructor.hasFormSupport) {
        fieldset.fields.push({ field, value: foundry.utils.getProperty(source, path) });
      }
    }
  }

  _prepareSubmitData(event, form, formData) {
    // TODO remove
    console.log("RAE formData", formData);
    return super._prepareSubmitData(event, form, formData);
  }
}

class RegionActiveEffectConfig extends ActiveEffectConfig {
  constructor(object, options) {
    super(object, options);

    this.regionConfig = options.regionConfig;
    this.targetButton = options.targetButton;
  }

  async _updateObject(event, formData) {
    // send value back
    const expanded = foundry.utils.expandObject(formData);
    this.regionConfig.onUpdateEffectValue(this.targetButton, expanded);
  }
}
