# UI Elements

| Name          | Version | Allowed Properties                                                                                                                                 | Description |
| ------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| panel         | >=0.12  | [Control](#controls)<br>[Layout](#layout)<br>[Data Binding](#data-binding)                                                                         |
| label         | >=0.12  | [Control](#controls)<br>[Layout](#layout)<br>[Data Binding](#data-binding)<br>[Text](#text)                                                        |
| image         | >=0.12  | [Control](#controls)<br>[Layout](#layout)<br>[Data Binding](#data-binding)<br>[Image](#image)                                                      |
| button        | >=0.12  | [Control](#controls)<br>[Layout](#layout)<br>[Data Binding](#data-binding)<br>[Input](#input)<br>[Focus](#focus)<br>[Button](#button)              |
| tab           | >=0.12  | [Control](#controls)<br>[Layout](#layout)<br>[Data Binding](#data-binding)<br>[Input](#input)<br>[Focus](#focus)                                   |
| scrollbar     | >=0.12  | [Control](#controls)<br>[Layout](#layout)<br>[Data Binding](#data-binding)<br>[Input](#input)<br>[Focus](#focus)<br>[Tab](#tab)<br>[Sound](#sound) |
| scrollbar_box | >=0.12  | [Control](#controls)<br>[Layout](#layout)<br>[Data Binding](#data-binding)                                                                         |
| screen        | >=0.12  | [Control](#controls)<br>[Layout](#layout)<br>[Data Binding](#data-binding)                                                                         |
| custom        | >=0.12  | [Control](#controls)<br>[Layout](#layout)<br>[Data Binding](#data-binding)<br>[Custom Render](#custom-render)                                      |

# Properties

## Controls
| Property     | Version | Type                                                                                                                                                             | Description |
| ------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| type         | >=0.12  | <table><thead><tr><th>Value</th><th>Version</th></tr></thead><tbody><tr><td>panel</td><td>>=0.12</td></tr><tr><td>label</td><td>>=0.12</td></tr></tbody></table> |
| alpha        | >=0.12  | 0.0 - 1.0                                                                                                                                                        |
| controls     | >=0.12  |
| property_bag | >=0.12  |

## Layout
| Property    | Version | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Description |
| ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| z_order     | 0.12    | number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| layer       | >=0.13  | number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| size        | >=0.12  | Vector [width, height]                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| offset      | >=0.12  | Vector [x, y]                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| anchor_from | >=0.12  | <table><thead><tr><th>Value</th><th>Version</th></tr></thead><tbody><tr><td>top_left</td><td>>=0.12</td></tr><tr><td>top_middle</td><td>>=0.12</td></tr><tr><td>top_right</td><td>>=0.12</td></tr><tr><td>left_middle</td><td>>=0.12</td></tr><tr><td>center</td><td>>=0.12</td></tr><tr><td>right_middle</td><td>>=0.12</td></tr><tr><td>bottom_left</td><td>>=0.12</td></tr><tr><td>bottom_middle</td><td>>=0.12</td></tr><tr><td>bottom_right</td><td>>=0.12</td></tr></tbody></table> |
| anchor_to   | >=0.12  | <table><thead><tr><th>Value</th><th>Version</th></tr></thead><tbody><tr><td>top_left</td><td>>=0.12</td></tr><tr><td>top_middle</td><td>>=0.12</td></tr><tr><td>top_right</td><td>>=0.12</td></tr><tr><td>left_middle</td><td>>=0.12</td></tr><tr><td>center</td><td>>=0.12</td></tr><tr><td>right_middle</td><td>>=0.12</td></tr><tr><td>bottom_left</td><td>>=0.12</td></tr><tr><td>bottom_middle</td><td>>=0.12</td></tr><tr><td>bottom_right</td><td>>=0.12</td></tr></tbody></table> |

## Data Binding
| Property                | Version | Type                                                             | Description |
| ----------------------- | ------- | ---------------------------------------------------------------- | ----------- |
| bindings                | >=0.12  | Array of [Data Binding Array Object](#data-binding-array-object) |
| binding_collection_name | >=0.12  | string                                                           |

### Data Binding Array Object
| Property              | Version | Type                                                                                                                                                                   | Description |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| binding_type          | >=0.12  | <table><thead><tr><th>Value</th><th>Version</th></tr></thead><tbody><tr><td>global</td><td>>=0.12</td></tr><tr><td>collection</td><td>>=0.12</td></tr></tbody></table> |
| binding_name          | >=0.12  | string                                                                                                                                                                 |
| binding_name_override | >=0.12  | string                                                                                                                                                                 |

## Text
| Property  | Version | Type                                                                                                                                                                                                   | Description |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| text      | >=0.12  | string                                                                                                                                                                                                 |
| color     | >=0.12  | Vector [red, green, blue] or [red, green, blue, alpha]                                                                                                                                                 |
| alignment | >=0.12  | <table><thead><tr><th>Value</th><th>Version</th></tr></thead><tbody><tr><td>left</td><td>>=0.12</td></tr><tr><td>center</td><td>>=0.12</td></tr><tr><td>right</td><td>>=0.12</td></tr></tbody></table> |
| shadow    | >=0.12  | boolean                                                                                                                                                                                                |

## Image
| Property       | Version | Type     | Description |
| -------------- | ------- | -------- | ----------- |
| texture        | >=0.12  | string   |
| color          | >=0.12  |
| uv             | >=0.12  | [u0, v0] |
| uv_size        | >=0.12  | []       |
| nineslice_size | >=0.12  |

## Button
| Property        | Version | Type   | Description |
| --------------- | ------- | ------ | ----------- |
| default_control | >=0.12  | string |
| hover_control   | >=0.12  | string |
| pressed_control | >=0.12  | string |

## Tab
| Property        | Version | Type    | Description |
| --------------- | ------- | ------- | ----------- |
| default_control | >=0.12  | string  |
| hover_control   | >=0.12  | string  |
| pressed_control | >=0.12  | string  |
| tab_group       | >=0.12  | integer |
| tab_index       | >=0.12  | integer |
| tab_content     | >=0.12  | string  |

## Sound
| Property     | Version | Type   | Description |
| ------------ | ------- | ------ | ----------- |
| sound_name   | >=0.12  | string |
| sound_volume | >=0.12  | number |
| sound_pitcg  | >=0.12  | number |

## Focus
| Property      | Version | Type   | Description |
| ------------- | ------- | ------ | ----------- |
| focus_enabled | >=0.12  | string |

## Input
| Property        | Version | Type                                                                 | Description |
| --------------- | ------- | -------------------------------------------------------------------- | ----------- |
| button_mappings | >=0.12  | Array of [Button Mapping Array Object](#button-mapping-array-object) |

### Button Mapping Array Object
| Property       | Version | Type                                                                                                                                                                                                                                          | Description |
| -------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| from_button_id | >=0.12  | string                                                                                                                                                                                                                                        |
| to_button_id   | >=0.12  | string                                                                                                                                                                                                                                        |
| condition      | >=0.12  | <table><thead><tr><th>Value</th><th>Version</th></tr></thead><tbody><tr><td>none</td><td>>=0.12</td></tr><tr><td>hover</td><td>>=0.12</td></tr><tr><td>focus</td><td>>=0.12</td></tr><tr><td>gesture</td><td>>=0.12</td></tr></tbody></table> |
| scope          | >=0.12  | <table><thead><tr><th>Value</th><th>Version</th></tr></thead><tbody><tr><td>view</td><td>>=0.12</td></tr></tbody></table>                                                                                                                     |

## Scrollbar
| Property                   | Version | Type | Description |
| -------------------------- | ------- | ---- | ----------- |
| scrollbar_box_track_button | >=0.12  |

## Scrollbar Box
| Property  | Version | Type | Description |
| --------- | ------- | ---- | ----------- |
| contained | >=0.12  |
| draggable | >=0.12  |

## Custom Render
| Property | Version | Type                                                                                                                                          | Description |
| -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| renderer | >=0.12  | <table><thead><tr><th>Value</th><th>Version</th></tr></thead><tbody><tr><td>menu_background_renderer</td><td>>=0.12</td></tr></tbody></table> |

# Property Bag

| Name                         | Version | Type    | Description |
| ---------------------------- | ------- | ------- | ----------- |
| is_durability                | >=0.12  | boolean |
| round_value                  | >=0.12  | boolean |
| #progress_bar_visible        | >=0.12  | oolean  |
| #progress_bar_total_amount   | >=0.12  | umber   |
| #progress_bar_current_amount | >=0.12  | number  |
| #visible                     | >=0.12  | boolean |
| #item_id_aux                 | >=0.12  | number  |
| #hover_text                  | >=0.12  | string  |

# Collection Names

<!-- 0.12 -->
- armor_items
- hotbar_items
- inventory_items
- crafting_input_items
- #network_world_item
- #local_world_item

# Button IDs

<!-- 0.12 -->
- button.menu_select
- button.menu_ok
- button.scrollbar_skip_track
- button.menu_up
- button.menu_down
- button.menu_left
- button.menu_right
- button.menu_select
- button.menu_play
- button.menu_buy_game
- button.menu_continue
- button.menu_cancel
- button.menu_exit
- button.menu_local_world_item
- button.menu_local_world_item_edit
- button.menu_network_world_item
- button.menu_network_world_item_remove
- button.menu_local_world_create
- button.menu_network_add_external
- button.menu_tab_left
- button.menu_tab_right
- button.armor_take_place
- button.menu_secondary_select
- button.controller_select
- button.menu_auto_place
- button.controller_secondary_select
- button.armor_auto_place
- button.menu_inventory_drop
- button.armor_drop_one
- button.menu_inventory_drop_all
- button.armor_drop_all
- button.menu_double_select
- button.armor_coalesce_stack
- button.crafting_in_take_all_place_all
- button.crafting_in_take_half_place_one
- button.crafting_in_auto_place
- button.crafting_in_drop_one
- button.crafting_in_drop_all
- button.crafting_in_coalesce_stack
- button.crafting_out_take_one
- button.crafting_out_auto_place_max
- button.crafting_out_drop_one
- button.crafting_out_drop_all
- button.inventory_take_all_place_all
- button.inventory_take_half_place_one
- button.inventory_auto_place
- button.inventory_drop_one
- button.inventory_drop_all
- button.inventory_coalesce_stack
- button.hotbar_take_all_place_all
- button.hotbar_take_all_place_all
- button.hotbar_take_half_place_one
- button.hotbar_auto_place
- button.hotbar_drop_one
- button.hotbar_drop_all
- button.hotbar_coalesce_stack
- button.menu_inventory_cancel
- button.cursor_drop_all
- button.cursor_drop_one

# Binding Names

<!-- 0.12 -->
- #button_left_trigger_description
- #button_right_trigger_description
- #button_dpad_description
- #button_thumbstick_description
- #gamepad_helper_visible
- #button_a_description
- #button_b_description
- #button_x_description
- #button_y_description
- #development_version
- #version
- #playername
- #header
- #description_1
- #description_2
- #file_size
- #local_world_item_grid_dimension
- #player_count
- #game_online
- #game_unavailable
- #game_offline
- #game_type_external
- #game_type_remote
- #game_type_xbox_live
- #network_world_item_grid_dimension
- #local_world_item_count
- #network_world_item_count
- #inventory_stack_count
- #item_durability_visible
- #item_durability_total_amount
- #item_durability_current_amount
- #visible
- #item_id_aux
- #hover_text
- #crafting_selected_item
- #crafting_selected_item_stack_count
- #progress_bar_visible
- #progress_bar_total_amount
- #progress_bar_current_amount
- #survival_crafting_output_item
- #survival_crafting_output_hover_text
- #survival_crafting_output_item_stack_count
- #work_bench_output_item
- #work_bench_output_hover_text
- #work_bench_output_item_stack_count
- #stone_cutter_output_item
- #stone_cutter_output_hover_text
- #stone_cutter_output_item_stack_count