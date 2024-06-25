# Region Active Effects

This module adds new behaviors to Foundry's [Scene Region](https://foundryvtt.com/article/scene-regions/) that can add Active Effects and Status Effects when in a region. For example, if you have region to represent a cursed area on the scene, you can now apply a cursed effect while tokens are in that region.

# Behavior Descriptions

# Active Effect

This will apply an active effect when a token enters a region and remove it when they exit the region.

# Status Effect

This will apply a status effect when a token enters a region and remove it when they exit the region.

# Status Effect Events

This lets you perform a certain action with a status effect based on an event, or trigger, that you specify. For example:

- apply a status effect when moving into the region
- removing a status effect when exiting the region
- toggle a status effect at the start of every combat round
