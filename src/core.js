const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { BooleanField, DocumentUUIDField, StringField } = foundry.data.fields;

/**
 * A mixin for the Active Effect behaviors based on core Foundry's handling of Active Effects.
 */
function CoreEffectMixin(Base) {
  return class BaseEffect extends Base {
    async _addEffect(actor) {
      const effect = await fromUuid(this.uuid);
      const origin = this.parent.uuid;

      // Enable an existing effect on the actor if it came from this behavior
      const existingEffect = actor.effects.find((e) => e.origin === origin);
      if (existingEffect)
        return existingEffect.update({
          ...effect.constructor.getInitialDuration(),
          disabled: false,
        });

      // Create a new effect on the actor
      const effectData = {
        ...effect.toObject(),
        disabled: false,
        transfer: false,
        origin,
      };
      return ActiveEffect.implementation.create(effectData, { parent: actor });
    }

    async _resetDuration(actor) {
      const effect = await fromUuid(this.uuid);
      const existingEffect = actor.effects.getName(effect.name);
      if (existingEffect)
        return existingEffect.update({ ...effect.constructor.getInitialDuration() });
    }

    async _enableOrDisable(actor, disabled) {
      const existingEffect = actor.effects.getName(this.name);
      if (existingEffect) return existingEffect.update({ disabled });
    }

    async _deleteEffect(actor) {
      // find name
      let name = this.name;
      if (!name && this.uuid) {
        const effect = await fromUuid(this.uuid);
        name = effect.name;
      }
      // get effect and delete it
      const existingEffect = actor.effects.getName(name);
      if (existingEffect) await existingEffect.delete();
    }
  };
}
