# Region Active Effects

This module adds new Behaviors to Foundry's [Scene Region](https://foundryvtt.com/article/scene-regions/) that can add Active Effects and Status Effects when in a Region. For example, if you have Region to represent a cursed area on the scene, you can now apply a cursed effect while tokens are in that Region.

# Behavior Descriptions

All of these Behaviors are event-based, meaning the Region only performs these if it's enabled and a subscribed Event is detected.

## Simple Behaviors

These two Behaviors are designed to be easy to use. They let you add an effect when a token is inside the Region. Specifically, they'll add the effect when a token enters the Region and remove it when the token exits the Region.

### Active Effect

This Behavior lets you apply an Active Effect when a token is inside a Region. It takes an existing active effect, referenced by its UUID, and will apply it when a token enters the Region and remove it when they exit the Region. It does have an option to disable the Active Effect when exiting the Region instead of deleting it.

### Status Effect

This Behavior lets you apply a status effect when a token is inside a Region. The status effects you can select are the same ones that appear on the Token HUD. These may vary from game system and also depending on what other modules you may have.

## Advanced Behaviors

These two Behaviors give you more flexibility and control over what to do with an effect and exactly when to do it based on the subscribed Events.

### Active Effect Events

This Behavior lets you perform certain actions with Active Effects when a certain Event occurs. The actions are:
- Add: add an Active Effect to a token
- Reset Duration: reset the duration of an existing Active Effect on the token
- Enable: enable an existing Active Effect on the token
- Disable: disable an existing Active Effect on the token
- Delete: delete an existing Active Effect on the token

Some example uses are:
- Reset the duration of an Active Effect at the start of the round
- Disable an Active Effect at the end of a tokens turn
- Add an active effect when a token moves into the Region

### Status Effect Events

This Behavior lets you perform certain actions with a status effect when a certain Event occurs. The actions are:
- Toggle: toggle a status effect on a token
- Apply: apply a status effect to a token
- Remove: remove a status effect from a token

Some example uses are:
- Apply a status effect when moving into the Region
- Removing a status effect when exiting the Region
- Toggle a status effect at the start of every combat round

## System-Specific Changes

The [Pathfinder Second Edition](https://foundryvtt.com/packages/pf2e) system uses Conditions and Effects instead of the standard Status Effects and Active Effects. This module changes the behaviors to work with these instead.
