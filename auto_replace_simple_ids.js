// Автоматическая замена простых ID (1:1)
// ВНИМАНИЕ: Проверьте результат перед коммитом!

const fs = require('fs');
const path = require('path');

const replacements = [
  {
    "from": "partition_dismantle_gk",
    "to": "demo_partition_dismantle_gk"
  },
  {
    "from": "partition_dismantle_gazobeton",
    "to": "demo_partition_dismantle_gazobeton"
  },
  {
    "from": "partition_dismantle_pazogreb",
    "to": "demo_partition_dismantle_pazogreb"
  },
  {
    "from": "partition_dismantle_brick",
    "to": "demo_partition_dismantle_brick"
  },
  {
    "from": "partition_dismantle_glass",
    "to": "demo_partition_dismantle_glass"
  },
  {
    "from": "partition_dismantle_concrete",
    "to": "demo_partition_dismantle_concrete"
  },
  {
    "from": "partition_dismantle_wood",
    "to": "demo_partition_dismantle_wood"
  },
  {
    "from": "partition_dismantle_pvc",
    "to": "demo_partition_dismantle_pvc"
  },
  {
    "from": "partition_dismantle_frame",
    "to": "demo_partition_dismantle_frame"
  },
  {
    "from": "partition_dismantle_insul",
    "to": "demo_partition_dismantle_insul"
  },
  {
    "from": "partition_dismantle_plinth",
    "to": "demo_partition_dismantle_plinth"
  },
  {
    "from": "partition_dismantle_debris",
    "to": "demo_partition_dismantle_debris"
  },
  {
    "from": "partition_dismantle_patch",
    "to": "demo_partition_dismantle_patch"
  },
  {
    "from": "door_opening_brick",
    "to": "demo_door_opening_brick"
  },
  {
    "from": "door_opening_concrete",
    "to": "demo_door_opening_concrete"
  },
  {
    "from": "door_opening_gasblock",
    "to": "demo_door_opening_gasblock"
  },
  {
    "from": "door_opening_pzp",
    "to": "demo_door_opening_pzp"
  },
  {
    "from": "door_opening_gyproc",
    "to": "demo_door_opening_gyproc"
  },
  {
    "from": "door_opening_frame",
    "to": "demo_door_opening_frame"
  },
  {
    "from": "door_opening_wood",
    "to": "demo_door_opening_wood"
  },
  {
    "from": "door_dismantle_door_leaf",
    "to": "demo_door_dismantle_door_leaf"
  },
  {
    "from": "door_dismantle_door_leaf_careful",
    "to": "demo_door_dismantle_door_leaf_careful"
  },
  {
    "from": "door_dismantle_door_leaf_carry",
    "to": "demo_door_dismantle_door_leaf_carry"
  },
  {
    "from": "door_dismantle_trim",
    "to": "demo_door_dismantle_trim"
  },
  {
    "from": "door_dismantle_threshold",
    "to": "demo_door_dismantle_threshold"
  },
  {
    "from": "door_dismantle_lintel",
    "to": "demo_door_dismantle_lintel"
  },
  {
    "from": "door_dismantle_patch",
    "to": "demo_door_dismantle_patch"
  },
  {
    "from": "window_opening_brick",
    "to": "demo_window_opening_brick"
  },
  {
    "from": "window_opening_concrete",
    "to": "demo_window_opening_concrete"
  },
  {
    "from": "window_opening_gasblock",
    "to": "demo_window_opening_gasblock"
  },
  {
    "from": "window_opening_pzp",
    "to": "demo_window_opening_pzp"
  },
  {
    "from": "window_opening_wood",
    "to": "demo_window_opening_wood"
  },
  {
    "from": "window_opening_frame",
    "to": "demo_window_opening_frame"
  },
  {
    "from": "window_dismantle_frame",
    "to": "demo_window_dismantle_frame"
  },
  {
    "from": "window_dismantle_frame_careful",
    "to": "demo_window_dismantle_frame_careful"
  },
  {
    "from": "window_dismantle_frame_carry",
    "to": "demo_window_dismantle_frame_carry"
  },
  {
    "from": "window_dismantle_sill",
    "to": "demo_window_dismantle_sill"
  },
  {
    "from": "window_dismantle_drip",
    "to": "demo_window_dismantle_drip"
  },
  {
    "from": "window_dismantle_trim",
    "to": "demo_window_dismantle_trim"
  },
  {
    "from": "window_dismantle_lintel",
    "to": "demo_window_dismantle_lintel"
  },
  {
    "from": "window_dismantle_patch",
    "to": "demo_window_dismantle_patch"
  },
  {
    "from": "balcony_opening_brick",
    "to": "demo_balcony_opening_brick"
  },
  {
    "from": "balcony_opening_concrete",
    "to": "demo_balcony_opening_concrete"
  },
  {
    "from": "balcony_opening_gasblock",
    "to": "demo_balcony_opening_gasblock"
  },
  {
    "from": "balcony_opening_pzp",
    "to": "demo_balcony_opening_pzp"
  },
  {
    "from": "balcony_opening_frame",
    "to": "demo_balcony_opening_frame"
  },
  {
    "from": "balcony_opening_wood",
    "to": "demo_balcony_opening_wood"
  },
  {
    "from": "balcony_dismantle_block",
    "to": "demo_balcony_dismantle_block"
  },
  {
    "from": "balcony_dismantle_block_careful",
    "to": "demo_balcony_dismantle_block_careful"
  },
  {
    "from": "balcony_dismantle_block_carry",
    "to": "demo_balcony_dismantle_block_carry"
  },
  {
    "from": "balcony_dismantle_sill",
    "to": "demo_balcony_dismantle_sill"
  },
  {
    "from": "balcony_dismantle_drip",
    "to": "demo_balcony_dismantle_drip"
  },
  {
    "from": "balcony_dismantle_trim",
    "to": "demo_balcony_dismantle_trim"
  },
  {
    "from": "balcony_dismantle_lintel",
    "to": "demo_balcony_dismantle_lintel"
  },
  {
    "from": "balcony_dismantle_patch",
    "to": "demo_balcony_dismantle_patch"
  },
  {
    "from": "stair_wooden_remove",
    "to": "demo_stair_wooden_remove"
  },
  {
    "from": "stair_metal_remove",
    "to": "demo_stair_metal_remove"
  },
  {
    "from": "stair_concrete_remove",
    "to": "demo_stair_concrete_remove"
  },
  {
    "from": "stair_step_remove",
    "to": "demo_stair_step_remove"
  },
  {
    "from": "stair_cladding_remove",
    "to": "demo_stair_cladding_remove"
  },
  {
    "from": "stair_baluster_remove",
    "to": "demo_stair_baluster_remove"
  },
  {
    "from": "stair_newel_remove",
    "to": "demo_stair_newel_remove"
  },
  {
    "from": "railing_wooden_remove",
    "to": "demo_railing_wooden_remove"
  },
  {
    "from": "railing_metal_remove",
    "to": "demo_railing_metal_remove"
  },
  {
    "from": "railing_glass_remove",
    "to": "demo_railing_glass_remove"
  },
  {
    "from": "railing_handrail_remove",
    "to": "demo_railing_handrail_remove"
  },
  {
    "from": "railing_post_remove",
    "to": "demo_railing_post_remove"
  },
  {
    "from": "wiring_remove",
    "to": "demo_wiring_remove"
  },
  {
    "from": "cable_channel_remove",
    "to": "demo_cable_channel_remove"
  },
  {
    "from": "panel_remove",
    "to": "demo_panel_remove"
  },
  {
    "from": "socket_remove",
    "to": "demo_socket_remove"
  },
  {
    "from": "lamp_remove",
    "to": "demo_lamp_remove"
  },
  {
    "from": "chandelier_remove",
    "to": "demo_chandelier_remove"
  },
  {
    "from": "wall_lamp_remove",
    "to": "demo_wall_lamp_remove"
  },
  {
    "from": "warm_floor_remove",
    "to": "demo_warm_floor_remove"
  },
  {
    "from": "exhaust_fan_remove",
    "to": "demo_exhaust_fan_remove"
  },
  {
    "from": "doorbell_remove",
    "to": "demo_doorbell_remove"
  },
  {
    "from": "ac_remove",
    "to": "demo_ac_remove"
  },
  {
    "from": "ac_remove_preserve",
    "to": "demo_ac_remove_preserve"
  },
  {
    "from": "ac_remove_complex",
    "to": "demo_ac_remove_complex"
  },
  {
    "from": "vent_fan_remove",
    "to": "demo_vent_fan_remove"
  },
  {
    "from": "vent_fan_remove_complex",
    "to": "demo_vent_fan_remove_complex"
  },
  {
    "from": "air_duct_remove",
    "to": "demo_air_duct_remove"
  },
  {
    "from": "air_duct_remove_insulated",
    "to": "demo_air_duct_remove_insulated"
  },
  {
    "from": "steel_pipe_15",
    "to": "demo_steel_pipe_15"
  },
  {
    "from": "steel_pipe_20",
    "to": "demo_steel_pipe_20"
  },
  {
    "from": "steel_pipe_25",
    "to": "demo_steel_pipe_25"
  },
  {
    "from": "steel_pipe_32",
    "to": "demo_steel_pipe_32"
  },
  {
    "from": "steel_pipe_40",
    "to": "demo_steel_pipe_40"
  },
  {
    "from": "steel_pipe_50",
    "to": "demo_steel_pipe_50"
  },
  {
    "from": "copper_pipe_10",
    "to": "demo_copper_pipe_10"
  },
  {
    "from": "copper_pipe_12",
    "to": "demo_copper_pipe_12"
  },
  {
    "from": "copper_pipe_15",
    "to": "demo_copper_pipe_15"
  },
  {
    "from": "copper_pipe_18",
    "to": "demo_copper_pipe_18"
  },
  {
    "from": "copper_pipe_22",
    "to": "demo_copper_pipe_22"
  },
  {
    "from": "copper_pipe_28",
    "to": "demo_copper_pipe_28"
  },
  {
    "from": "pp_pipe_16",
    "to": "demo_pp_pipe_16"
  },
  {
    "from": "pp_pipe_20",
    "to": "demo_pp_pipe_20"
  },
  {
    "from": "pp_pipe_25",
    "to": "demo_pp_pipe_25"
  },
  {
    "from": "pp_pipe_32",
    "to": "demo_pp_pipe_32"
  },
  {
    "from": "pp_pipe_40",
    "to": "demo_pp_pipe_40"
  },
  {
    "from": "metalplastic_pipe_16",
    "to": "demo_metalplastic_pipe_16"
  },
  {
    "from": "metalplastic_pipe_20",
    "to": "demo_metalplastic_pipe_20"
  },
  {
    "from": "metalplastic_pipe_25",
    "to": "demo_metalplastic_pipe_25"
  },
  {
    "from": "metalplastic_pipe_32",
    "to": "demo_metalplastic_pipe_32"
  },
  {
    "from": "pex_pipe_16",
    "to": "demo_pex_pipe_16"
  },
  {
    "from": "pex_pipe_20",
    "to": "demo_pex_pipe_20"
  },
  {
    "from": "pex_pipe_25",
    "to": "demo_pex_pipe_25"
  },
  {
    "from": "valve_remove",
    "to": "demo_valve_remove"
  },
  {
    "from": "collector_remove",
    "to": "demo_collector_remove"
  },
  {
    "from": "filter_remove",
    "to": "demo_filter_remove"
  },
  {
    "from": "reducer_remove",
    "to": "demo_reducer_remove"
  },
  {
    "from": "cast_iron_50",
    "to": "demo_cast_iron_50"
  },
  {
    "from": "cast_iron_100",
    "to": "demo_cast_iron_100"
  },
  {
    "from": "cast_iron_150",
    "to": "demo_cast_iron_150"
  },
  {
    "from": "flue_110",
    "to": "demo_flue_110"
  },
  {
    "from": "flue_160",
    "to": "demo_flue_160"
  },
  {
    "from": "plastic_32",
    "to": "demo_plastic_32"
  },
  {
    "from": "plastic_40",
    "to": "demo_plastic_40"
  },
  {
    "from": "plastic_50",
    "to": "demo_plastic_50"
  },
  {
    "from": "plastic_110",
    "to": "demo_plastic_110"
  },
  {
    "from": "plastic_160",
    "to": "demo_plastic_160"
  },
  {
    "from": "drainage_fitting_remove",
    "to": "demo_drainage_fitting_remove"
  },
  {
    "from": "syphon_remove",
    "to": "demo_syphon_remove"
  },
  {
    "from": "drainage_stand_remove",
    "to": "demo_drainage_stand_remove"
  },
  {
    "from": "hydrolock_remove",
    "to": "demo_hydrolock_remove"
  },
  {
    "from": "revision_luk_remove",
    "to": "demo_revision_luk_remove"
  },
  {
    "from": "well_remove",
    "to": "demo_well_remove"
  },
  {
    "from": "sink_remove",
    "to": "demo_sink_remove"
  },
  {
    "from": "sink_remove_complex",
    "to": "demo_sink_remove_complex"
  },
  {
    "from": "sink_remove_careful",
    "to": "demo_sink_remove_careful"
  },
  {
    "from": "bathtub_remove",
    "to": "demo_bathtub_remove"
  },
  {
    "from": "bathtub_remove_castiron",
    "to": "demo_bathtub_remove_castiron"
  },
  {
    "from": "bathtub_remove_carry",
    "to": "demo_bathtub_remove_carry"
  },
  {
    "from": "bathtub_remove_careful",
    "to": "demo_bathtub_remove_careful"
  },
  {
    "from": "shower_remove",
    "to": "demo_shower_remove"
  },
  {
    "from": "shower_remove_complex",
    "to": "demo_shower_remove_complex"
  },
  {
    "from": "shower_remove_carry",
    "to": "demo_shower_remove_carry"
  },
  {
    "from": "faucet_remove",
    "to": "demo_faucet_remove"
  },
  {
    "from": "toilet_remove",
    "to": "demo_toilet_remove"
  },
  {
    "from": "toilet_remove_installation",
    "to": "demo_toilet_remove_installation"
  },
  {
    "from": "toilet_remove_careful",
    "to": "demo_toilet_remove_careful"
  },
  {
    "from": "bidet_remove",
    "to": "demo_bidet_remove"
  },
  {
    "from": "towel_dryer_remove",
    "to": "demo_towel_dryer_remove"
  },
  {
    "from": "towel_dryer_remove_complex",
    "to": "demo_towel_dryer_remove_complex"
  },
  {
    "from": "washing_machine_remove",
    "to": "demo_washing_machine_remove"
  },
  {
    "from": "washing_machine_remove_carry",
    "to": "demo_washing_machine_remove_carry"
  },
  {
    "from": "dishwasher_remove",
    "to": "demo_dishwasher_remove"
  },
  {
    "from": "dishwasher_remove_carry",
    "to": "demo_dishwasher_remove_carry"
  },
  {
    "from": "radiator_remove",
    "to": "demo_radiator_remove"
  },
  {
    "from": "infloor_convector_remove",
    "to": "demo_infloor_convector_remove"
  },
  {
    "from": "floor_parquet_board",
    "to": "demo_floor_parquet_board"
  },
  {
    "from": "floor_self_leveling",
    "to": "demo_floor_self_leveling"
  },
  {
    "from": "floor_dry_screed",
    "to": "demo_floor_dry_screed"
  },
  {
    "from": "floor_csp_5cm",
    "to": "demo_floor_csp_5cm"
  },
  {
    "from": "floor_csp_over_5cm",
    "to": "demo_floor_csp_over_5cm"
  },
  {
    "from": "floor_reinforced_csp_5cm",
    "to": "demo_floor_reinforced_csp_5cm"
  },
  {
    "from": "floor_reinforced_csp_over_5cm",
    "to": "demo_floor_reinforced_csp_over_5cm"
  },
  {
    "from": "floor_diamond_cut",
    "to": "demo_floor_diamond_cut"
  },
  {
    "from": "floor_brick",
    "to": "demo_floor_brick"
  },
  {
    "from": "wall_plaster_3cm",
    "to": "demo_wall_plaster_3cm"
  },
  {
    "from": "wall_plaster_5cm",
    "to": "demo_wall_plaster_5cm"
  },
  {
    "from": "wall_plaster_reinforced_5cm",
    "to": "demo_wall_plaster_reinforced_5cm"
  },
  {
    "from": "wall_cement_3cm",
    "to": "demo_wall_cement_3cm"
  },
  {
    "from": "wall_cement_5cm",
    "to": "demo_wall_cement_5cm"
  },
  {
    "from": "wall_cement_reinforced_3cm",
    "to": "demo_wall_cement_reinforced_3cm"
  },
  {
    "from": "wall_cement_reinforced_5cm",
    "to": "demo_wall_cement_reinforced_5cm"
  },
  {
    "from": "wall_mdf_pvc",
    "to": "demo_wall_mdf_pvc"
  },
  {
    "from": "wall_ree_panel",
    "to": "demo_wall_ree_panel"
  },
  {
    "from": "wall_panels",
    "to": "demo_wall_panels"
  },
  {
    "from": "ceiling_plaster",
    "to": "demo_ceiling_plaster"
  },
  {
    "from": "floor_screed_compaction",
    "to": "rough_floor_screed_compaction"
  },
  {
    "from": "floor_screed_sand_leveling",
    "to": "rough_floor_screed_sand_leveling"
  },
  {
    "from": "floor_screed_primer",
    "to": "rough_floor_screed_primer"
  },
  {
    "from": "floor_screed_mesh_weld_5x5",
    "to": "rough_floor_screed_mesh_weld_5x5"
  },
  {
    "from": "floor_screed_mesh_weld_10x10",
    "to": "rough_floor_screed_mesh_weld_10x10"
  },
  {
    "from": "floor_screed_mesh_weld_15x15",
    "to": "rough_floor_screed_mesh_weld_15x15"
  },
  {
    "from": "floor_screed_mesh_masonry_5x5",
    "to": "rough_floor_screed_mesh_masonry_5x5"
  },
  {
    "from": "floor_screed_mesh_masonry_10x10",
    "to": "rough_floor_screed_mesh_masonry_10x10"
  },
  {
    "from": "floor_screed_mesh_masonry_15x15",
    "to": "rough_floor_screed_mesh_masonry_15x15"
  },
  {
    "from": "floor_screed_mesh_composite_5x5",
    "to": "rough_floor_screed_mesh_composite_5x5"
  },
  {
    "from": "floor_screed_mesh_composite_10x10",
    "to": "rough_floor_screed_mesh_composite_10x10"
  },
  {
    "from": "floor_screed_mesh_composite_15x15",
    "to": "rough_floor_screed_mesh_composite_15x15"
  },
  {
    "from": "floor_screed_reinforced",
    "to": "rough_floor_screed_reinforced"
  },
  {
    "from": "floor_screed_beacons",
    "to": "rough_floor_screed_beacons"
  },
  {
    "from": "floor_level_csp_5cm_mech",
    "to": "rough_floor_level_csp_5cm_mech"
  },
  {
    "from": "floor_level_csp_over_5cm_mech",
    "to": "rough_floor_level_csp_over_5cm_mech"
  },
  {
    "from": "floor_screed_keramzit",
    "to": "rough_floor_screed_keramzit"
  },
  {
    "from": "floor_screed_deform_joint",
    "to": "rough_floor_screed_deform_joint"
  },
  {
    "from": "floor_screed_grinding",
    "to": "rough_floor_screed_grinding"
  },
  {
    "from": "floor_screed_repair",
    "to": "rough_floor_screed_repair"
  },
  {
    "from": "floor_base_primer_rough",
    "to": "rough_floor_base_primer_rough"
  },
  {
    "from": "floor_base_cleaning_rough",
    "to": "rough_floor_base_cleaning_rough"
  },
  {
    "from": "floor_base_repair_rough",
    "to": "rough_floor_base_repair_rough"
  },
  {
    "from": "floor_base_grinding_rough",
    "to": "rough_floor_base_grinding_rough"
  },
  {
    "from": "floor_base_dustproof_rough",
    "to": "rough_floor_base_dustproof_rough"
  },
  {
    "from": "floor_base_leveling_compound",
    "to": "rough_floor_base_leveling_compound"
  },
  {
    "from": "floor_waterproof_geotextile",
    "to": "rough_floor_waterproof_geotextile"
  },
  {
    "from": "floor_waterproof_pe_film_250",
    "to": "rough_floor_waterproof_pe_film_250"
  },
  {
    "from": "floor_vapor_barrier_rough",
    "to": "rough_floor_vapor_barrier_rough"
  },
  {
    "from": "floor_waterproof_coating",
    "to": "rough_floor_waterproof_coating"
  },
  {
    "from": "floor_waterproof_bitumen",
    "to": "rough_floor_waterproof_bitumen"
  },
  {
    "from": "floor_waterproof_penetrating",
    "to": "rough_floor_waterproof_penetrating"
  },
  {
    "from": "floor_waterproof_polyurea",
    "to": "rough_floor_waterproof_polyurea"
  },
  {
    "from": "floor_waterproof_tray",
    "to": "rough_floor_waterproof_tray"
  },
  {
    "from": "floor_waterproof_joint_tape",
    "to": "rough_floor_waterproof_joint_tape"
  },
  {
    "from": "floor_waterproof_rufizol_tape",
    "to": "rough_floor_waterproof_rufizol_tape"
  },
  {
    "from": "floor_waterproof_damper_tape",
    "to": "rough_floor_waterproof_damper_tape"
  },
  {
    "from": "floor_waterproof_test",
    "to": "rough_floor_waterproof_test"
  },
  {
    "from": "floor_thermal_insulation",
    "to": "rough_floor_thermal_insulation"
  },
  {
    "from": "floor_insulation_eps",
    "to": "rough_floor_insulation_eps"
  },
  {
    "from": "floor_sound_mineral_wool",
    "to": "rough_floor_sound_mineral_wool"
  },
  {
    "from": "floor_sound_mat",
    "to": "rough_floor_sound_mat"
  },
  {
    "from": "floor_sound_cork",
    "to": "rough_floor_sound_cork"
  },
  {
    "from": "floor_sound_impact_membrane",
    "to": "rough_floor_sound_impact_membrane"
  },
  {
    "from": "floor_sound_floating_screed",
    "to": "rough_floor_sound_floating_screed"
  },
  {
    "from": "floor_sound_quartz_sand",
    "to": "rough_floor_sound_quartz_sand"
  },
  {
    "from": "floor_sound_perimeter_tape",
    "to": "rough_floor_sound_perimeter_tape"
  },
  {
    "from": "wall_rough_antifungal",
    "to": "rough_wall_rough_antifungal"
  },
  {
    "from": "wall_rough_cleaning",
    "to": "rough_wall_rough_cleaning"
  },
  {
    "from": "wall_rough_primer",
    "to": "rough_wall_rough_primer"
  },
  {
    "from": "wall_rough_primer_deep",
    "to": "rough_wall_rough_primer_deep"
  },
  {
    "from": "wall_rough_primer_contact",
    "to": "rough_wall_rough_primer_contact"
  },
  {
    "from": "wall_rough_waterproof_coat",
    "to": "rough_wall_rough_waterproof_coat"
  },
  {
    "from": "wall_rough_waterproof_roll",
    "to": "rough_wall_rough_waterproof_roll"
  },
  {
    "from": "wall_rough_waterproof_pen",
    "to": "rough_wall_rough_waterproof_pen"
  },
  {
    "from": "wall_rough_waterproof_tape",
    "to": "rough_wall_rough_waterproof_tape"
  },
  {
    "from": "wall_rough_vapor_barrier",
    "to": "rough_wall_rough_vapor_barrier"
  },
  {
    "from": "plaster_surface_clean",
    "to": "rough_plaster_surface_clean"
  },
  {
    "from": "plaster_antifungal",
    "to": "rough_plaster_antifungal"
  },
  {
    "from": "plaster_primer_contact",
    "to": "rough_plaster_primer_contact"
  },
  {
    "from": "plaster_lighthouse",
    "to": "rough_plaster_lighthouse"
  },
  {
    "from": "plaster_corner_bead",
    "to": "rough_plaster_corner_bead"
  },
  {
    "from": "plaster_mesh_metal",
    "to": "rough_plaster_mesh_metal"
  },
  {
    "from": "plaster_mesh_fiberglass",
    "to": "rough_plaster_mesh_fiberglass"
  },
  {
    "from": "plaster_mesh_polymer",
    "to": "rough_plaster_mesh_polymer"
  },
  {
    "from": "plaster_reinforced_mix",
    "to": "rough_plaster_reinforced_mix"
  },
  {
    "from": "plaster_gips_3cm",
    "to": "rough_plaster_gips_3cm"
  },
  {
    "from": "plaster_gips_5cm",
    "to": "rough_plaster_gips_5cm"
  },
  {
    "from": "plaster_gips_over_5cm",
    "to": "rough_plaster_gips_over_5cm"
  },
  {
    "from": "plaster_gips_3cm_mech",
    "to": "rough_plaster_gips_3cm_mech"
  },
  {
    "from": "plaster_gips_5cm_mech",
    "to": "rough_plaster_gips_5cm_mech"
  },
  {
    "from": "plaster_gips_over5cm_mech",
    "to": "rough_plaster_gips_over5cm_mech"
  },
  {
    "from": "plaster_arch",
    "to": "rough_plaster_arch"
  },
  {
    "from": "plaster_cement_surface_clean",
    "to": "rough_plaster_cement_surface_clean"
  },
  {
    "from": "plaster_cement_antifungal",
    "to": "rough_plaster_cement_antifungal"
  },
  {
    "from": "plaster_cement_spatter",
    "to": "rough_plaster_cement_spatter"
  },
  {
    "from": "plaster_cement_mesh_metal",
    "to": "rough_plaster_cement_mesh_metal"
  },
  {
    "from": "plaster_cement_lighthouse",
    "to": "rough_plaster_cement_lighthouse"
  },
  {
    "from": "plaster_cement_corner",
    "to": "rough_plaster_cement_corner"
  },
  {
    "from": "plaster_cement_3cm",
    "to": "rough_plaster_cement_3cm"
  },
  {
    "from": "plaster_cement_5cm",
    "to": "rough_plaster_cement_5cm"
  },
  {
    "from": "plaster_cement_over_5cm",
    "to": "rough_plaster_cement_over_5cm"
  },
  {
    "from": "plaster_cement_waterproof",
    "to": "rough_plaster_cement_waterproof"
  },
  {
    "from": "plaster_cement_facade",
    "to": "rough_plaster_cement_facade"
  },
  {
    "from": "plaster_slope_window",
    "to": "rough_plaster_slope_window"
  },
  {
    "from": "plaster_slope_door",
    "to": "rough_plaster_slope_door"
  },
  {
    "from": "plaster_niche",
    "to": "rough_plaster_niche"
  },
  {
    "from": "plaster_arch_work",
    "to": "rough_plaster_arch_work"
  },
  {
    "from": "plaster_column",
    "to": "rough_plaster_column"
  },
  {
    "from": "plaster_expansion_joint",
    "to": "rough_plaster_expansion_joint"
  },
  {
    "from": "plaster_repair_crack",
    "to": "rough_plaster_repair_crack"
  },
  {
    "from": "plaster_gkl_antifungal",
    "to": "rough_plaster_gkl_antifungal"
  },
  {
    "from": "plaster_gkl_primer",
    "to": "rough_plaster_gkl_primer"
  },
  {
    "from": "plaster_gkl_frame",
    "to": "rough_plaster_gkl_frame"
  },
  {
    "from": "plaster_wall_insul",
    "to": "rough_plaster_wall_insul"
  },
  {
    "from": "plaster_wall_vapor",
    "to": "rough_plaster_wall_vapor"
  },
  {
    "from": "plaster_gkl",
    "to": "rough_plaster_gkl"
  },
  {
    "from": "plaster_gkl_glue",
    "to": "rough_plaster_gkl_glue"
  },
  {
    "from": "plaster_gkl_moisture",
    "to": "rough_plaster_gkl_moisture"
  },
  {
    "from": "plaster_sound",
    "to": "rough_plaster_sound"
  },
  {
    "from": "putty_local",
    "to": "rough_putty_local"
  },
  {
    "from": "putty_wallpaper",
    "to": "rough_putty_wallpaper"
  },
  {
    "from": "putty_wallpaper_mech",
    "to": "rough_putty_wallpaper_mech"
  },
  {
    "from": "putty_paint",
    "to": "rough_putty_paint"
  },
  {
    "from": "putty_paint_mech",
    "to": "rough_putty_paint_mech"
  },
  {
    "from": "putty_finish_2layers",
    "to": "rough_putty_finish_2layers"
  },
  {
    "from": "putty_finish_premium",
    "to": "rough_putty_finish_premium"
  },
  {
    "from": "putty_tile",
    "to": "rough_putty_tile"
  },
  {
    "from": "putty_vetonit",
    "to": "rough_putty_vetonit"
  },
  {
    "from": "putty_rotband",
    "to": "rough_putty_rotband"
  },
  {
    "from": "putty_sanding",
    "to": "rough_putty_sanding"
  },
  {
    "from": "putty_primer",
    "to": "rough_putty_primer"
  },
  {
    "from": "putty_primer_deep",
    "to": "rough_putty_primer_deep"
  },
  {
    "from": "putty_primer_contact",
    "to": "rough_putty_primer_contact"
  },
  {
    "from": "putty_fiberglass",
    "to": "rough_putty_fiberglass"
  },
  {
    "from": "putty_mesh_reinforce",
    "to": "rough_putty_mesh_reinforce"
  },
  {
    "from": "putty_gkl_seams",
    "to": "rough_putty_gkl_seams"
  },
  {
    "from": "putty_corner_bead",
    "to": "rough_putty_corner_bead"
  },
  {
    "from": "ceiling_rough_antifungal",
    "to": "rough_ceiling_rough_antifungal"
  },
  {
    "from": "ceiling_rough_cleaning",
    "to": "rough_ceiling_rough_cleaning"
  },
  {
    "from": "ceiling_rough_primer",
    "to": "rough_ceiling_rough_primer"
  },
  {
    "from": "ceiling_rough_primer_deep",
    "to": "rough_ceiling_rough_primer_deep"
  },
  {
    "from": "ceiling_rough_primer_contact",
    "to": "rough_ceiling_rough_primer_contact"
  },
  {
    "from": "ceiling_rough_waterproof_coat",
    "to": "rough_ceiling_rough_waterproof_coat"
  },
  {
    "from": "ceiling_rough_waterproof_pen",
    "to": "rough_ceiling_rough_waterproof_pen"
  },
  {
    "from": "ceiling_rough_waterproof_tape",
    "to": "rough_ceiling_rough_waterproof_tape"
  },
  {
    "from": "ceiling_rough_vapor_barrier",
    "to": "rough_ceiling_rough_vapor_barrier"
  },
  {
    "from": "ceiling_antifungal",
    "to": "rough_ceiling_antifungal"
  },
  {
    "from": "ceiling_primer_contact",
    "to": "rough_ceiling_primer_contact"
  },
  {
    "from": "ceiling_lighthouse",
    "to": "rough_ceiling_lighthouse"
  },
  {
    "from": "ceiling_plaster_gips",
    "to": "rough_ceiling_plaster_gips"
  },
  {
    "from": "ceiling_plaster_cement",
    "to": "rough_ceiling_plaster_cement"
  },
  {
    "from": "ceiling_level",
    "to": "rough_ceiling_level"
  },
  {
    "from": "ceiling_level_self",
    "to": "rough_ceiling_level_self"
  },
  {
    "from": "ceiling_level_gkl",
    "to": "rough_ceiling_level_gkl"
  },
  {
    "from": "ceiling_level_gkl_glue",
    "to": "rough_ceiling_level_gkl_glue"
  },
  {
    "from": "ceiling_primer",
    "to": "rough_ceiling_primer"
  },
  {
    "from": "ceiling_primer_deep",
    "to": "rough_ceiling_primer_deep"
  },
  {
    "from": "ceiling_local_repair",
    "to": "rough_ceiling_local_repair"
  },
  {
    "from": "ceiling_gkl_seams",
    "to": "rough_ceiling_gkl_seams"
  },
  {
    "from": "ceiling_fiberglass",
    "to": "rough_ceiling_fiberglass"
  },
  {
    "from": "ceiling_putty",
    "to": "rough_ceiling_putty"
  },
  {
    "from": "ceiling_putty_wallpaper",
    "to": "rough_ceiling_putty_wallpaper"
  },
  {
    "from": "ceiling_putty_sanding",
    "to": "rough_ceiling_putty_sanding"
  },
  {
    "from": "ceiling_insul_minwool",
    "to": "rough_ceiling_insul_minwool"
  },
  {
    "from": "ceiling_insul_eps",
    "to": "rough_ceiling_insul_eps"
  },
  {
    "from": "ceiling_sound",
    "to": "rough_ceiling_sound"
  },
  {
    "from": "socket_install",
    "to": "eng_elec_socket_install"
  },
  {
    "from": "socket_child",
    "to": "eng_elec_socket_child"
  },
  {
    "from": "socket_moisture",
    "to": "eng_elec_socket_moisture"
  },
  {
    "from": "usb_socket",
    "to": "eng_elec_usb_socket"
  },
  {
    "from": "floor_socket",
    "to": "eng_elec_floor_socket"
  },
  {
    "from": "outdoor_socket",
    "to": "eng_elec_outdoor_socket"
  },
  {
    "from": "switch_install",
    "to": "eng_elec_switch_install"
  },
  {
    "from": "dimmer_install",
    "to": "eng_elec_dimmer_install"
  },
  {
    "from": "motion_switch",
    "to": "eng_elec_motion_switch"
  },
  {
    "from": "socket_group",
    "to": "eng_elec_socket_group"
  },
  {
    "from": "subsocket",
    "to": "eng_elec_subsocket"
  },
  {
    "from": "wall_chasing",
    "to": "eng_elec_wall_chasing"
  },
  {
    "from": "wall_chasing_concrete",
    "to": "eng_elec_wall_chasing_concrete"
  },
  {
    "from": "wall_chasing_brick",
    "to": "eng_elec_wall_chasing_brick"
  },
  {
    "from": "hole_drilling_electric",
    "to": "eng_elec_hole_drilling_electric"
  },
  {
    "from": "cable_box_seal",
    "to": "eng_elec_cable_box_seal"
  },
  {
    "from": "wiring_hidden",
    "to": "eng_elec_wiring_hidden"
  },
  {
    "from": "wiring_open",
    "to": "eng_elec_wiring_open"
  },
  {
    "from": "corrugation",
    "to": "eng_elec_corrugation"
  },
  {
    "from": "pipe_conduit",
    "to": "eng_elec_pipe_conduit"
  },
  {
    "from": "cable_channel",
    "to": "eng_elec_cable_channel"
  },
  {
    "from": "cable_tray",
    "to": "eng_elec_cable_tray"
  },
  {
    "from": "cable_tray_ceiling",
    "to": "eng_elec_cable_tray_ceiling"
  },
  {
    "from": "cable_floor_duct",
    "to": "eng_elec_cable_floor_duct"
  },
  {
    "from": "junction_box",
    "to": "eng_elec_junction_box"
  },
  {
    "from": "led_strip",
    "to": "eng_elec_led_strip"
  },
  {
    "from": "spot_light",
    "to": "eng_elec_spot_light"
  },
  {
    "from": "light_install",
    "to": "eng_elec_light_install"
  },
  {
    "from": "chandelier_install",
    "to": "eng_elec_chandelier_install"
  },
  {
    "from": "wall_light",
    "to": "eng_elec_wall_light"
  },
  {
    "from": "track_light",
    "to": "eng_elec_track_light"
  },
  {
    "from": "outdoor_light",
    "to": "eng_elec_outdoor_light"
  },
  {
    "from": "emergency_light",
    "to": "eng_elec_emergency_light"
  },
  {
    "from": "panel_install",
    "to": "eng_elec_panel_install"
  },
  {
    "from": "breaker_install",
    "to": "eng_elec_breaker_install"
  },
  {
    "from": "panel_breaker_group",
    "to": "eng_elec_panel_breaker_group"
  },
  {
    "from": "uzo_install",
    "to": "eng_elec_uzo_install"
  },
  {
    "from": "surge_protection",
    "to": "eng_elec_surge_protection"
  },
  {
    "from": "grounding",
    "to": "eng_elec_grounding"
  },
  {
    "from": "cable_marking",
    "to": "eng_elec_cable_marking"
  },
  {
    "from": "electrical_testing",
    "to": "eng_elec_electrical_testing"
  },
  {
    "from": "electrical_testing_room",
    "to": "eng_elec_electrical_testing_room"
  },
  {
    "from": "weak_current",
    "to": "eng_elec_weak_current"
  },
  {
    "from": "internet_tv",
    "to": "eng_elec_internet_tv"
  },
  {
    "from": "tv_antenna_install",
    "to": "eng_elec_tv_antenna_install"
  },
  {
    "from": "audio_point",
    "to": "eng_elec_audio_point"
  },
  {
    "from": "intercom",
    "to": "eng_elec_intercom"
  },
  {
    "from": "intercom_video",
    "to": "eng_elec_intercom_video"
  },
  {
    "from": "access_control",
    "to": "eng_elec_access_control"
  },
  {
    "from": "cctv",
    "to": "eng_elec_cctv"
  },
  {
    "from": "fan_install",
    "to": "eng_elec_fan_install"
  },
  {
    "from": "smart_home_prep",
    "to": "eng_elec_smart_home_prep"
  },
  {
    "from": "smart_home_setup",
    "to": "eng_elec_smart_home_setup"
  },
  {
    "from": "smart_home_elem",
    "to": "eng_elec_smart_home_elem"
  },
  {
    "from": "smart_curtain",
    "to": "eng_elec_smart_curtain"
  },
  {
    "from": "smart_motion",
    "to": "eng_elec_smart_motion"
  },
  {
    "from": "smart_light_sensor",
    "to": "eng_elec_smart_light_sensor"
  },
  {
    "from": "smart_climate",
    "to": "eng_elec_smart_climate"
  },
  {
    "from": "smoke_detector",
    "to": "eng_elec_smoke_detector"
  },
  {
    "from": "co_detector",
    "to": "eng_elec_co_detector"
  },
  {
    "from": "warm_floor_el",
    "to": "eng_elec_warm_floor_el"
  },
  {
    "from": "thermostat",
    "to": "eng_elec_thermostat"
  },
  {
    "from": "ac_unit_install",
    "to": "eng_vent_ac_unit_install"
  },
  {
    "from": "ac_outdoor_install",
    "to": "eng_vent_ac_outdoor_install"
  },
  {
    "from": "ac_cassette_install",
    "to": "eng_vent_ac_cassette_install"
  },
  {
    "from": "ac_duct_install",
    "to": "eng_vent_ac_duct_install"
  },
  {
    "from": "ac_floor_install",
    "to": "eng_vent_ac_floor_install"
  },
  {
    "from": "ac_route",
    "to": "eng_vent_ac_route"
  },
  {
    "from": "ac_power",
    "to": "eng_vent_ac_power"
  },
  {
    "from": "ac_drain",
    "to": "eng_vent_ac_drain"
  },
  {
    "from": "ac_pipe_insulation",
    "to": "eng_vent_ac_pipe_insulation"
  },
  {
    "from": "ac_bracket",
    "to": "eng_vent_ac_bracket"
  },
  {
    "from": "ac_box_cover",
    "to": "eng_vent_ac_box_cover"
  },
  {
    "from": "ac_service_port",
    "to": "eng_vent_ac_service_port"
  },
  {
    "from": "wall_drilling",
    "to": "eng_vent_wall_drilling"
  },
  {
    "from": "vent_shaft_adapt",
    "to": "eng_vent_vent_shaft_adapt"
  },
  {
    "from": "vent_fan_install",
    "to": "eng_vent_vent_fan_install"
  },
  {
    "from": "vent_grille_install",
    "to": "eng_vent_vent_grille_install"
  },
  {
    "from": "vent_valve_install",
    "to": "eng_vent_vent_valve_install"
  },
  {
    "from": "vent_check_valve",
    "to": "eng_vent_vent_check_valve"
  },
  {
    "from": "vent_noise_reducer",
    "to": "eng_vent_vent_noise_reducer"
  },
  {
    "from": "hood_connection",
    "to": "eng_vent_hood_connection"
  },
  {
    "from": "hrv_install",
    "to": "eng_vent_hrv_install"
  },
  {
    "from": "supply_unit_install",
    "to": "eng_vent_supply_unit_install"
  },
  {
    "from": "air_duct_install",
    "to": "eng_vent_air_duct_install"
  },
  {
    "from": "flex_duct_install",
    "to": "eng_vent_flex_duct_install"
  },
  {
    "from": "air_duct_insulation",
    "to": "eng_vent_air_duct_insulation"
  },
  {
    "from": "vent_box_cover",
    "to": "eng_vent_vent_box_cover"
  },
  {
    "from": "plenum_box",
    "to": "eng_vent_plenum_box"
  },
  {
    "from": "diffuser_install",
    "to": "eng_vent_diffuser_install"
  },
  {
    "from": "ventilation_panel",
    "to": "eng_vent_ventilation_panel"
  },
  {
    "from": "system_startup",
    "to": "eng_vent_system_startup"
  },
  {
    "from": "vent_balancing",
    "to": "eng_vent_vent_balancing"
  },
  {
    "from": "vent_airflow_adjustment",
    "to": "eng_vent_vent_airflow_adjustment"
  },
  {
    "from": "vent_automation_setup",
    "to": "eng_vent_vent_automation_setup"
  },
  {
    "from": "vent_cleaning",
    "to": "eng_vent_vent_cleaning"
  },
  {
    "from": "pipe_chasing_water",
    "to": "eng_water_pipe_chasing_water"
  },
  {
    "from": "water_pipe_sleeve",
    "to": "eng_water_water_pipe_sleeve"
  },
  {
    "from": "water_riser_connect",
    "to": "eng_water_water_riser_connect"
  },
  {
    "from": "water_riser_replace",
    "to": "eng_water_water_riser_replace"
  },
  {
    "from": "water_riser_valve",
    "to": "eng_water_water_riser_valve"
  },
  {
    "from": "water_pipe_pp",
    "to": "eng_water_water_pipe_pp"
  },
  {
    "from": "water_pipe_pex",
    "to": "eng_water_water_pipe_pex"
  },
  {
    "from": "water_pipe_metalplastic",
    "to": "eng_water_water_pipe_metalplastic"
  },
  {
    "from": "water_pipe_copper",
    "to": "eng_water_water_pipe_copper"
  },
  {
    "from": "water_pipe_stainless",
    "to": "eng_water_water_pipe_stainless"
  },
  {
    "from": "water_pipe_hdpe",
    "to": "eng_water_water_pipe_hdpe"
  },
  {
    "from": "water_pipe_corrugated",
    "to": "eng_water_water_pipe_corrugated"
  },
  {
    "from": "water_pipe_hidden",
    "to": "eng_water_water_pipe_hidden"
  },
  {
    "from": "water_pipe_open",
    "to": "eng_water_water_pipe_open"
  },
  {
    "from": "water_pipe_press_fitting",
    "to": "eng_water_water_pipe_press_fitting"
  },
  {
    "from": "water_pipe_clamp",
    "to": "eng_water_water_pipe_clamp"
  },
  {
    "from": "pipe_insulation_water",
    "to": "eng_water_pipe_insulation_water"
  },
  {
    "from": "water_point",
    "to": "eng_water_water_point"
  },
  {
    "from": "water_pipe_test",
    "to": "eng_water_water_pipe_test"
  },
  {
    "from": "collector_unit",
    "to": "eng_water_collector_unit"
  },
  {
    "from": "collector_cabinet",
    "to": "eng_water_collector_cabinet"
  },
  {
    "from": "shutoff_valve",
    "to": "eng_water_shutoff_valve"
  },
  {
    "from": "pressure_reducer",
    "to": "eng_water_pressure_reducer"
  },
  {
    "from": "collector_valve",
    "to": "eng_water_collector_valve"
  },
  {
    "from": "collector_flowmeter",
    "to": "eng_water_collector_flowmeter"
  },
  {
    "from": "check_valve",
    "to": "eng_water_check_valve"
  },
  {
    "from": "ball_valve",
    "to": "eng_water_ball_valve"
  },
  {
    "from": "angle_valve",
    "to": "eng_water_angle_valve"
  },
  {
    "from": "thermostatic_valve",
    "to": "eng_water_thermostatic_valve"
  },
  {
    "from": "mixing_valve",
    "to": "eng_water_mixing_valve"
  },
  {
    "from": "expansion_vessel_water",
    "to": "eng_water_expansion_vessel_water"
  },
  {
    "from": "air_vent_water",
    "to": "eng_water_air_vent_water"
  },
  {
    "from": "water_hammer_arrestor",
    "to": "eng_water_water_hammer_arrestor"
  },
  {
    "from": "filter_install",
    "to": "eng_water_filter_install"
  },
  {
    "from": "main_filter",
    "to": "eng_water_main_filter"
  },
  {
    "from": "water_softener",
    "to": "eng_water_water_softener"
  },
  {
    "from": "reverse_osmosis",
    "to": "eng_water_reverse_osmosis"
  },
  {
    "from": "water_meter",
    "to": "eng_water_water_meter"
  },
  {
    "from": "filter_cartridge",
    "to": "eng_water_filter_cartridge"
  },
  {
    "from": "filter_uv",
    "to": "eng_water_filter_uv"
  },
  {
    "from": "filter_iron_removal",
    "to": "eng_water_filter_iron_removal"
  },
  {
    "from": "filter_carbon",
    "to": "eng_water_filter_carbon"
  },
  {
    "from": "water_meter_hot",
    "to": "eng_water_water_meter_hot"
  },
  {
    "from": "water_meter_cold",
    "to": "eng_water_water_meter_cold"
  },
  {
    "from": "water_meter_seal",
    "to": "eng_water_water_meter_seal"
  },
  {
    "from": "dosing_pump",
    "to": "eng_water_dosing_pump"
  },
  {
    "from": "installation_frame",
    "to": "eng_water_installation_frame"
  },
  {
    "from": "mixer_connection",
    "to": "eng_water_mixer_connection"
  },
  {
    "from": "water_pump_install",
    "to": "eng_water_water_pump_install"
  },
  {
    "from": "shower_cabin_connect",
    "to": "eng_water_shower_cabin_connect"
  },
  {
    "from": "bathtub_connect",
    "to": "eng_water_bathtub_connect"
  },
  {
    "from": "sink_connect",
    "to": "eng_water_sink_connect"
  },
  {
    "from": "toilet_connect",
    "to": "eng_water_toilet_connect"
  },
  {
    "from": "washing_machine_connect",
    "to": "eng_water_washing_machine_connect"
  },
  {
    "from": "dishwasher_connect",
    "to": "eng_water_dishwasher_connect"
  },
  {
    "from": "towel_dryer_connect",
    "to": "eng_water_towel_dryer_connect"
  },
  {
    "from": "water_dispenser_connect",
    "to": "eng_water_water_dispenser_connect"
  },
  {
    "from": "circulation_pump",
    "to": "eng_water_circulation_pump"
  },
  {
    "from": "recirculation_pipe",
    "to": "eng_water_recirculation_pipe"
  },
  {
    "from": "leak_protection",
    "to": "eng_water_leak_protection"
  },
  {
    "from": "smart_leak_sensor",
    "to": "eng_water_smart_leak_sensor"
  },
  {
    "from": "water_pressure_test",
    "to": "eng_water_water_pressure_test"
  },
  {
    "from": "water_pressure_test_bathroom",
    "to": "eng_water_water_pressure_test_bathroom"
  },
  {
    "from": "water_pipe_repair",
    "to": "eng_water_water_pipe_repair"
  },
  {
    "from": "water_pipe_flush",
    "to": "eng_water_water_pipe_flush"
  },
  {
    "from": "water_pipe_insulation_rep",
    "to": "eng_water_water_pipe_insulation_rep"
  },
  {
    "from": "water_leak_elimination",
    "to": "eng_water_water_leak_elimination"
  },
  {
    "from": "water_pipe_replace",
    "to": "eng_water_water_pipe_replace"
  },
  {
    "from": "water_pipe_replace_bathroom",
    "to": "eng_water_water_pipe_replace_bathroom"
  },
  {
    "from": "water_pipe_replace_kitchen",
    "to": "eng_water_water_pipe_replace_kitchen"
  },
  {
    "from": "water_pipe_replace_apartment",
    "to": "eng_water_water_pipe_replace_apartment"
  },
  {
    "from": "water_system_audit",
    "to": "eng_water_water_system_audit"
  },
  {
    "from": "drain_pipe_chasing",
    "to": "eng_drain_drain_pipe_chasing"
  },
  {
    "from": "drain_pipe_sleeve",
    "to": "eng_drain_drain_pipe_sleeve"
  },
  {
    "from": "drain_pipe_32",
    "to": "eng_drain_drain_pipe_32"
  },
  {
    "from": "drain_pipe_40",
    "to": "eng_drain_drain_pipe_40"
  },
  {
    "from": "drain_pipe_50",
    "to": "eng_drain_drain_pipe_50"
  },
  {
    "from": "drain_pipe_110",
    "to": "eng_drain_drain_pipe_110"
  },
  {
    "from": "drain_pipe_160",
    "to": "eng_drain_drain_pipe_160"
  },
  {
    "from": "silent_drainage",
    "to": "eng_drain_silent_drainage"
  },
  {
    "from": "drain_pipe_hidden",
    "to": "eng_drain_drain_pipe_hidden"
  },
  {
    "from": "drain_pipe_open",
    "to": "eng_drain_drain_pipe_open"
  },
  {
    "from": "drain_pipe_insulation",
    "to": "eng_drain_drain_pipe_insulation"
  },
  {
    "from": "drain_pipe_clamp",
    "to": "eng_drain_drain_pipe_clamp"
  },
  {
    "from": "drain_point",
    "to": "eng_drain_drain_point"
  },
  {
    "from": "drain_pipe_repair",
    "to": "eng_drain_drain_pipe_repair"
  },
  {
    "from": "drain_riser",
    "to": "eng_drain_drain_riser"
  },
  {
    "from": "drain_riser_connect",
    "to": "eng_drain_drain_riser_connect"
  },
  {
    "from": "drain_riser_replace",
    "to": "eng_drain_drain_riser_replace"
  },
  {
    "from": "drain_revision",
    "to": "eng_drain_drain_revision"
  },
  {
    "from": "drain_fan_pipe",
    "to": "eng_drain_drain_fan_pipe"
  },
  {
    "from": "drain_riser_insulation",
    "to": "eng_drain_drain_riser_insulation"
  },
  {
    "from": "drain_riser_clamp",
    "to": "eng_drain_drain_riser_clamp"
  },
  {
    "from": "drain_fan_valve",
    "to": "eng_drain_drain_fan_valve"
  },
  {
    "from": "drain_riser_audit",
    "to": "eng_drain_drain_riser_audit"
  },
  {
    "from": "drain_trap",
    "to": "eng_drain_drain_trap"
  },
  {
    "from": "shower_channel",
    "to": "eng_drain_shower_channel"
  },
  {
    "from": "hydrolock_install",
    "to": "eng_drain_hydrolock_install"
  },
  {
    "from": "drain_floor_trap_hidden",
    "to": "eng_drain_drain_floor_trap_hidden"
  },
  {
    "from": "drain_wall_outlet",
    "to": "eng_drain_drain_wall_outlet"
  },
  {
    "from": "drain_siphon_bottle",
    "to": "eng_drain_drain_siphon_bottle"
  },
  {
    "from": "drain_siphon_overflow",
    "to": "eng_drain_drain_siphon_overflow"
  },
  {
    "from": "drain_odor_trap",
    "to": "eng_drain_drain_odor_trap"
  },
  {
    "from": "drain_grease_trap",
    "to": "eng_drain_drain_grease_trap"
  },
  {
    "from": "drain_trap_clean",
    "to": "eng_drain_drain_trap_clean"
  },
  {
    "from": "drain_pump",
    "to": "eng_drain_drain_pump"
  },
  {
    "from": "drain_pump_station",
    "to": "eng_drain_drain_pump_station"
  },
  {
    "from": "drain_pump_submersible",
    "to": "eng_drain_drain_pump_submersible"
  },
  {
    "from": "drain_pump_pipe",
    "to": "eng_drain_drain_pump_pipe"
  },
  {
    "from": "drain_pump_check_valve",
    "to": "eng_drain_drain_pump_check_valve"
  },
  {
    "from": "drain_pump_service",
    "to": "eng_drain_drain_pump_service"
  },
  {
    "from": "drain_inspection",
    "to": "eng_drain_drain_inspection"
  },
  {
    "from": "drain_cleaning",
    "to": "eng_drain_drain_cleaning"
  },
  {
    "from": "drain_pressure_test",
    "to": "eng_drain_drain_pressure_test"
  },
  {
    "from": "drain_pressure_test_bathroom",
    "to": "eng_drain_drain_pressure_test_bathroom"
  },
  {
    "from": "drain_hydro_flush",
    "to": "eng_drain_drain_hydro_flush"
  },
  {
    "from": "drain_chemical_flush",
    "to": "eng_drain_drain_chemical_flush"
  },
  {
    "from": "drain_leak_fix",
    "to": "eng_drain_drain_leak_fix"
  },
  {
    "from": "drain_system_audit",
    "to": "eng_drain_drain_system_audit"
  },
  {
    "from": "drain_full_replace",
    "to": "eng_drain_drain_full_replace"
  },
  {
    "from": "drain_full_replace_bathroom",
    "to": "eng_drain_drain_full_replace_bathroom"
  },
  {
    "from": "drain_full_replace_kitchen",
    "to": "eng_drain_drain_full_replace_kitchen"
  },
  {
    "from": "drain_full_replace_apartment",
    "to": "eng_drain_drain_full_replace_apartment"
  },
  {
    "from": "radiator_install",
    "to": "eng_heat_radiator_install"
  },
  {
    "from": "radiator_bottom",
    "to": "eng_heat_radiator_bottom"
  },
  {
    "from": "radiator_side",
    "to": "eng_heat_radiator_side"
  },
  {
    "from": "radiator_relocation",
    "to": "eng_heat_radiator_relocation"
  },
  {
    "from": "radiator_connection",
    "to": "eng_heat_radiator_connection"
  },
  {
    "from": "convector_install",
    "to": "eng_heat_convector_install"
  },
  {
    "from": "infloor_convector",
    "to": "eng_heat_infloor_convector"
  },
  {
    "from": "heated_towel_rail",
    "to": "eng_heat_heated_towel_rail"
  },
  {
    "from": "radiator_bracket",
    "to": "eng_heat_radiator_bracket"
  },
  {
    "from": "radiator_screen",
    "to": "eng_heat_radiator_screen"
  },
  {
    "from": "radiator_flush",
    "to": "eng_heat_radiator_flush"
  },
  {
    "from": "towel_rail_electric",
    "to": "eng_heat_towel_rail_electric"
  },
  {
    "from": "towel_rail_combined",
    "to": "eng_heat_towel_rail_combined"
  },
  {
    "from": "infloor_convector_box",
    "to": "eng_heat_infloor_convector_box"
  },
  {
    "from": "heating_pipe",
    "to": "eng_heat_heating_pipe"
  },
  {
    "from": "heating_riser_connect",
    "to": "eng_heat_heating_riser_connect"
  },
  {
    "from": "heating_riser_replace",
    "to": "eng_heat_heating_riser_replace"
  },
  {
    "from": "pipe_insulation_heat",
    "to": "eng_heat_pipe_insulation_heat"
  },
  {
    "from": "pipe_chasing_heat",
    "to": "eng_heat_pipe_chasing_heat"
  },
  {
    "from": "heating_pipe_repair",
    "to": "eng_heat_heating_pipe_repair"
  },
  {
    "from": "heating_pipe_pp",
    "to": "eng_heat_heating_pipe_pp"
  },
  {
    "from": "heating_pipe_pex",
    "to": "eng_heat_heating_pipe_pex"
  },
  {
    "from": "heating_pipe_copper",
    "to": "eng_heat_heating_pipe_copper"
  },
  {
    "from": "heating_pipe_steel",
    "to": "eng_heat_heating_pipe_steel"
  },
  {
    "from": "heating_pipe_sleeve",
    "to": "eng_heat_heating_pipe_sleeve"
  },
  {
    "from": "heating_pipe_clamp",
    "to": "eng_heat_heating_pipe_clamp"
  },
  {
    "from": "heating_pipe_hidden",
    "to": "eng_heat_heating_pipe_hidden"
  },
  {
    "from": "heating_riser_insulation",
    "to": "eng_heat_heating_riser_insulation"
  },
  {
    "from": "boiler_install",
    "to": "eng_heat_boiler_install"
  },
  {
    "from": "pump_group",
    "to": "eng_heat_pump_group"
  },
  {
    "from": "expansion_tank",
    "to": "eng_heat_expansion_tank"
  },
  {
    "from": "safety_group",
    "to": "eng_heat_safety_group"
  },
  {
    "from": "air_vent_install",
    "to": "eng_heat_air_vent_install"
  },
  {
    "from": "boiler_gas",
    "to": "eng_heat_boiler_gas"
  },
  {
    "from": "boiler_electric",
    "to": "eng_heat_boiler_electric"
  },
  {
    "from": "boiler_solid_fuel",
    "to": "eng_heat_boiler_solid_fuel"
  },
  {
    "from": "boiler_flue",
    "to": "eng_heat_boiler_flue"
  },
  {
    "from": "heat_exchanger",
    "to": "eng_heat_heat_exchanger"
  },
  {
    "from": "circulation_pump_heat",
    "to": "eng_heat_circulation_pump_heat"
  },
  {
    "from": "dirt_separator",
    "to": "eng_heat_dirt_separator"
  },
  {
    "from": "hydraulic_arrow",
    "to": "eng_heat_hydraulic_arrow"
  },
  {
    "from": "buffer_tank",
    "to": "eng_heat_buffer_tank"
  },
  {
    "from": "valve_heating",
    "to": "eng_heat_valve_heating"
  },
  {
    "from": "balancing_valve",
    "to": "eng_heat_balancing_valve"
  },
  {
    "from": "heat_meter",
    "to": "eng_heat_heat_meter"
  },
  {
    "from": "thermostatic_head",
    "to": "eng_heat_thermostatic_head"
  },
  {
    "from": "zone_valve",
    "to": "eng_heat_zone_valve"
  },
  {
    "from": "mixing_valve_heat",
    "to": "eng_heat_mixing_valve_heat"
  },
  {
    "from": "check_valve_heat",
    "to": "eng_heat_check_valve_heat"
  },
  {
    "from": "shutoff_valve_heat",
    "to": "eng_heat_shutoff_valve_heat"
  },
  {
    "from": "pressure_gauge",
    "to": "eng_heat_pressure_gauge"
  },
  {
    "from": "smart_thermostat",
    "to": "eng_heat_smart_thermostat"
  },
  {
    "from": "heating_controller",
    "to": "eng_heat_heating_controller"
  },
  {
    "from": "floor_heating_cabinet",
    "to": "eng_heat_floor_heating_cabinet"
  },
  {
    "from": "floor_heating_loop_connect",
    "to": "eng_heat_floor_heating_loop_connect"
  },
  {
    "from": "floor_heating_ir",
    "to": "eng_heat_floor_heating_ir"
  },
  {
    "from": "floor_heating_mat",
    "to": "eng_heat_floor_heating_mat"
  },
  {
    "from": "floor_heating_film",
    "to": "eng_heat_floor_heating_film"
  },
  {
    "from": "floor_heating_pipe_pex",
    "to": "eng_heat_floor_heating_pipe_pex"
  },
  {
    "from": "floor_heating_screed",
    "to": "eng_heat_floor_heating_screed"
  },
  {
    "from": "floor_heating_insulation",
    "to": "eng_heat_floor_heating_insulation"
  },
  {
    "from": "floor_heating_test",
    "to": "eng_heat_floor_heating_test"
  },
  {
    "from": "floor_heating_balance",
    "to": "eng_heat_floor_heating_balance"
  },
  {
    "from": "crimping",
    "to": "eng_heat_crimping"
  },
  {
    "from": "heating_pressure_test",
    "to": "eng_heat_heating_pressure_test"
  },
  {
    "from": "heating_startup",
    "to": "eng_heat_heating_startup"
  },
  {
    "from": "heating_flush",
    "to": "eng_heat_heating_flush"
  },
  {
    "from": "heating_refill",
    "to": "eng_heat_heating_refill"
  },
  {
    "from": "heating_antifreeze",
    "to": "eng_heat_heating_antifreeze"
  },
  {
    "from": "heating_air_bleeding",
    "to": "eng_heat_heating_air_bleeding"
  },
  {
    "from": "heating_balance_branch",
    "to": "eng_heat_heating_balance_branch"
  },
  {
    "from": "heating_audit",
    "to": "eng_heat_heating_audit"
  },
  {
    "from": "floor_laminate_diag",
    "to": "finish_floor_floor_laminate_diag"
  },
  {
    "from": "floor_laminate_herringbone",
    "to": "finish_floor_floor_laminate_herringbone"
  },
  {
    "from": "floor_laminate_large_room",
    "to": "finish_floor_floor_laminate_large_room"
  },
  {
    "from": "floor_laminate_underlay",
    "to": "finish_floor_floor_laminate_underlay"
  },
  {
    "from": "floor_laminate_vapor_barrier",
    "to": "finish_floor_floor_laminate_vapor_barrier"
  },
  {
    "from": "floor_laminate_cutouts",
    "to": "finish_floor_floor_laminate_cutouts"
  },
  {
    "from": "floor_linoleum_glue",
    "to": "finish_floor_floor_linoleum_glue"
  },
  {
    "from": "floor_linoleum_semi_glue",
    "to": "finish_floor_floor_linoleum_semi_glue"
  },
  {
    "from": "floor_linoleum_design",
    "to": "finish_floor_floor_linoleum_design"
  },
  {
    "from": "floor_linoleum_weld_hot",
    "to": "finish_floor_floor_linoleum_weld_hot"
  },
  {
    "from": "floor_linoleum_weld",
    "to": "finish_floor_floor_linoleum_weld"
  },
  {
    "from": "floor_linoleum_cove",
    "to": "finish_floor_floor_linoleum_cove"
  },
  {
    "from": "floor_linoleum_base_prep",
    "to": "finish_floor_floor_linoleum_base_prep"
  },
  {
    "from": "floor_linoleum_primer",
    "to": "finish_floor_floor_linoleum_primer"
  },
  {
    "from": "floor_linoleum_leveling",
    "to": "finish_floor_floor_linoleum_leveling"
  },
  {
    "from": "floor_linoleum_underlay",
    "to": "finish_floor_floor_linoleum_underlay"
  },
  {
    "from": "floor_linoleum_threshold",
    "to": "finish_floor_floor_linoleum_threshold"
  },
  {
    "from": "floor_linoleum_plinth",
    "to": "finish_floor_floor_linoleum_plinth"
  },
  {
    "from": "floor_linoleum_repair",
    "to": "finish_floor_floor_linoleum_repair"
  },
  {
    "from": "floor_linoleum_cutouts",
    "to": "finish_floor_floor_linoleum_cutouts"
  },
  {
    "from": "floor_pvc_roll_glue",
    "to": "finish_floor_floor_pvc_roll_glue"
  },
  {
    "from": "floor_pvc_roll_weld",
    "to": "finish_floor_floor_pvc_roll_weld"
  },
  {
    "from": "floor_pvc_roll_cove",
    "to": "finish_floor_floor_pvc_roll_cove"
  },
  {
    "from": "floor_carpet_glue",
    "to": "finish_floor_floor_carpet_glue"
  },
  {
    "from": "floor_carpet_stretch",
    "to": "finish_floor_floor_carpet_stretch"
  },
  {
    "from": "floor_carpet_free",
    "to": "finish_floor_floor_carpet_free"
  },
  {
    "from": "floor_carpet_stairs",
    "to": "finish_floor_floor_carpet_stairs"
  },
  {
    "from": "floor_carpet_underlay",
    "to": "finish_floor_floor_carpet_underlay"
  },
  {
    "from": "floor_carpet_base_prep",
    "to": "finish_floor_floor_carpet_base_prep"
  },
  {
    "from": "floor_carpet_primer",
    "to": "finish_floor_floor_carpet_primer"
  },
  {
    "from": "floor_carpet_seam",
    "to": "finish_floor_floor_carpet_seam"
  },
  {
    "from": "floor_carpet_seam_weld",
    "to": "finish_floor_floor_carpet_seam_weld"
  },
  {
    "from": "floor_carpet_gripper",
    "to": "finish_floor_floor_carpet_gripper"
  },
  {
    "from": "floor_carpet_threshold",
    "to": "finish_floor_floor_carpet_threshold"
  },
  {
    "from": "floor_carpet_plinth",
    "to": "finish_floor_floor_carpet_plinth"
  },
  {
    "from": "floor_carpet_repair",
    "to": "finish_floor_floor_carpet_repair"
  },
  {
    "from": "floor_carpet_cutouts",
    "to": "finish_floor_floor_carpet_cutouts"
  },
  {
    "from": "floor_cork_diag",
    "to": "finish_floor_floor_cork_diag"
  },
  {
    "from": "floor_cork_glue",
    "to": "finish_floor_floor_cork_glue"
  },
  {
    "from": "floor_cork_glue_diag",
    "to": "finish_floor_floor_cork_glue_diag"
  },
  {
    "from": "floor_cork_underlay",
    "to": "finish_floor_floor_cork_underlay"
  },
  {
    "from": "floor_cork_base_prep",
    "to": "finish_floor_floor_cork_base_prep"
  },
  {
    "from": "floor_cork_primer",
    "to": "finish_floor_floor_cork_primer"
  },
  {
    "from": "floor_cork_lacquer",
    "to": "finish_floor_floor_cork_lacquer"
  },
  {
    "from": "floor_cork_oil",
    "to": "finish_floor_floor_cork_oil"
  },
  {
    "from": "floor_cork_sanding",
    "to": "finish_floor_floor_cork_sanding"
  },
  {
    "from": "floor_cork_repair",
    "to": "finish_floor_floor_cork_repair"
  },
  {
    "from": "floor_cork_plinth",
    "to": "finish_floor_floor_cork_plinth"
  },
  {
    "from": "floor_cork_threshold",
    "to": "finish_floor_floor_cork_threshold"
  },
  {
    "from": "floor_cork_sealing",
    "to": "finish_floor_floor_cork_sealing"
  },
  {
    "from": "floor_cork_warm",
    "to": "finish_floor_floor_cork_warm"
  },
  {
    "from": "floor_plinth",
    "to": "finish_floor_floor_plinth"
  },
  {
    "from": "floor_plinth_hidden",
    "to": "finish_floor_floor_plinth_hidden"
  },
  {
    "from": "floor_threshold",
    "to": "finish_floor_floor_threshold"
  },
  {
    "from": "floor_tile_profile",
    "to": "finish_floor_floor_tile_profile"
  },
  {
    "from": "floor_tile_profile_corner",
    "to": "finish_floor_floor_tile_profile_corner"
  },
  {
    "from": "floor_profile_stair",
    "to": "finish_floor_floor_profile_stair"
  },
  {
    "from": "floor_base_primer",
    "to": "finish_floor_floor_base_primer"
  },
  {
    "from": "floor_base_repair",
    "to": "finish_floor_floor_base_repair"
  },
  {
    "from": "floor_base_screed_repair",
    "to": "finish_floor_floor_base_screed_repair"
  },
  {
    "from": "floor_base_grinding",
    "to": "finish_floor_floor_base_grinding"
  },
  {
    "from": "floor_base_dustproof",
    "to": "finish_floor_floor_base_dustproof"
  },
  {
    "from": "floor_vapor_barrier",
    "to": "finish_floor_floor_vapor_barrier"
  },
  {
    "from": "floor_heating_thermostat",
    "to": "finish_floor_floor_heating_thermostat"
  },
  {
    "from": "floor_cover_dismantle",
    "to": "finish_floor_floor_cover_dismantle"
  },
  {
    "from": "floor_plinth_dismantle",
    "to": "finish_floor_floor_plinth_dismantle"
  },
  {
    "from": "floor_parquet_herringbone",
    "to": "finish_floor_floor_parquet_herringbone"
  },
  {
    "from": "floor_parquet_diagonal",
    "to": "finish_floor_floor_parquet_diagonal"
  },
  {
    "from": "floor_parquet_versailles",
    "to": "finish_floor_floor_parquet_versailles"
  },
  {
    "from": "floor_parquet_sanding",
    "to": "finish_floor_floor_parquet_sanding"
  },
  {
    "from": "floor_parquet_primer",
    "to": "finish_floor_floor_parquet_primer"
  },
  {
    "from": "floor_parquet_lacquer",
    "to": "finish_floor_floor_parquet_lacquer"
  },
  {
    "from": "floor_parquet_oil",
    "to": "finish_floor_floor_parquet_oil"
  },
  {
    "from": "floor_parquet_repair_plank",
    "to": "finish_floor_floor_parquet_repair_plank"
  },
  {
    "from": "floor_parquet_gap_fill",
    "to": "finish_floor_floor_parquet_gap_fill"
  },
  {
    "from": "floor_parquet_glue_down",
    "to": "finish_floor_floor_parquet_glue_down"
  },
  {
    "from": "floor_engineered_float",
    "to": "finish_floor_floor_engineered_float"
  },
  {
    "from": "floor_engineered_diagonal",
    "to": "finish_floor_floor_engineered_diagonal"
  },
  {
    "from": "floor_engineered_herringbone",
    "to": "finish_floor_floor_engineered_herringbone"
  },
  {
    "from": "floor_engineered_sanding",
    "to": "finish_floor_floor_engineered_sanding"
  },
  {
    "from": "floor_engineered_oil",
    "to": "finish_floor_floor_engineered_oil"
  },
  {
    "from": "floor_engineered_lacquer",
    "to": "finish_floor_floor_engineered_lacquer"
  },
  {
    "from": "floor_engineered_repair_plank",
    "to": "finish_floor_floor_engineered_repair_plank"
  },
  {
    "from": "floor_engineered_base_prep",
    "to": "finish_floor_floor_engineered_base_prep"
  },
  {
    "from": "floor_solid_diagonal",
    "to": "finish_floor_floor_solid_diagonal"
  },
  {
    "from": "floor_solid_herringbone",
    "to": "finish_floor_floor_solid_herringbone"
  },
  {
    "from": "floor_solid_sanding",
    "to": "finish_floor_floor_solid_sanding"
  },
  {
    "from": "floor_solid_primer",
    "to": "finish_floor_floor_solid_primer"
  },
  {
    "from": "floor_solid_lacquer",
    "to": "finish_floor_floor_solid_lacquer"
  },
  {
    "from": "floor_solid_oil",
    "to": "finish_floor_floor_solid_oil"
  },
  {
    "from": "floor_solid_repair_plank",
    "to": "finish_floor_floor_solid_repair_plank"
  },
  {
    "from": "floor_solid_gap_fill",
    "to": "finish_floor_floor_solid_gap_fill"
  },
  {
    "from": "floor_solid_glue_down",
    "to": "finish_floor_floor_solid_glue_down"
  },
  {
    "from": "floor_ceramic_medium",
    "to": "finish_floor_floor_ceramic_medium"
  },
  {
    "from": "floor_ceramic_diagonal",
    "to": "finish_floor_floor_ceramic_diagonal"
  },
  {
    "from": "floor_ceramic_pattern",
    "to": "finish_floor_floor_ceramic_pattern"
  },
  {
    "from": "floor_ceramic_mosaic",
    "to": "finish_floor_floor_ceramic_mosaic"
  },
  {
    "from": "floor_ceramic_warm",
    "to": "finish_floor_floor_ceramic_warm"
  },
  {
    "from": "floor_ceramic_waterproof",
    "to": "finish_floor_floor_ceramic_waterproof"
  },
  {
    "from": "floor_ceramic_leveling_system",
    "to": "finish_floor_floor_ceramic_leveling_system"
  },
  {
    "from": "floor_ceramic_grout",
    "to": "finish_floor_floor_ceramic_grout"
  },
  {
    "from": "floor_ceramic_grout_epoxy",
    "to": "finish_floor_floor_ceramic_grout_epoxy"
  },
  {
    "from": "floor_ceramic_profile_corner",
    "to": "finish_floor_floor_ceramic_profile_corner"
  },
  {
    "from": "floor_ceramic_repair_tile",
    "to": "finish_floor_floor_ceramic_repair_tile"
  },
  {
    "from": "floor_ceramic_sealing",
    "to": "finish_floor_floor_ceramic_sealing"
  },
  {
    "from": "floor_porcelain_large",
    "to": "finish_floor_floor_porcelain_large"
  },
  {
    "from": "floor_porcelain_diagonal",
    "to": "finish_floor_floor_porcelain_diagonal"
  },
  {
    "from": "floor_porcelain_pattern",
    "to": "finish_floor_floor_porcelain_pattern"
  },
  {
    "from": "floor_porcelain_herringbone",
    "to": "finish_floor_floor_porcelain_herringbone"
  },
  {
    "from": "floor_porcelain_warm",
    "to": "finish_floor_floor_porcelain_warm"
  },
  {
    "from": "floor_porcelain_waterproof",
    "to": "finish_floor_floor_porcelain_waterproof"
  },
  {
    "from": "floor_porcelain_leveling_system",
    "to": "finish_floor_floor_porcelain_leveling_system"
  },
  {
    "from": "floor_porcelain_grout",
    "to": "finish_floor_floor_porcelain_grout"
  },
  {
    "from": "floor_porcelain_grout_epoxy",
    "to": "finish_floor_floor_porcelain_grout_epoxy"
  },
  {
    "from": "floor_porcelain_profile_corner",
    "to": "finish_floor_floor_porcelain_profile_corner"
  },
  {
    "from": "floor_porcelain_repair_tile",
    "to": "finish_floor_floor_porcelain_repair_tile"
  },
  {
    "from": "floor_porcelain_sealing",
    "to": "finish_floor_floor_porcelain_sealing"
  },
  {
    "from": "floor_porcelain_grinding",
    "to": "finish_floor_floor_porcelain_grinding"
  },
  {
    "from": "floor_self_leveling_finish",
    "to": "finish_floor_floor_self_leveling_finish"
  },
  {
    "from": "floor_self_leveling_thick",
    "to": "finish_floor_floor_self_leveling_thick"
  },
  {
    "from": "floor_self_leveling_3d",
    "to": "finish_floor_floor_self_leveling_3d"
  },
  {
    "from": "floor_self_leveling_primer",
    "to": "finish_floor_floor_self_leveling_primer"
  },
  {
    "from": "floor_self_leveling_repair",
    "to": "finish_floor_floor_self_leveling_repair"
  },
  {
    "from": "floor_self_leveling_warm",
    "to": "finish_floor_floor_self_leveling_warm"
  },
  {
    "from": "floor_self_leveling_topcoat",
    "to": "finish_floor_floor_self_leveling_topcoat"
  },
  {
    "from": "floor_self_leveling_expansion",
    "to": "finish_floor_floor_self_leveling_expansion"
  },
  {
    "from": "floor_epoxy",
    "to": "finish_floor_floor_epoxy"
  },
  {
    "from": "floor_epoxy_thick",
    "to": "finish_floor_floor_epoxy_thick"
  },
  {
    "from": "floor_epoxy_quartz",
    "to": "finish_floor_floor_epoxy_quartz"
  },
  {
    "from": "floor_epoxy_flake",
    "to": "finish_floor_floor_epoxy_flake"
  },
  {
    "from": "floor_epoxy_metallic",
    "to": "finish_floor_floor_epoxy_metallic"
  },
  {
    "from": "floor_polyurethane",
    "to": "finish_floor_floor_polyurethane"
  },
  {
    "from": "floor_polyurethane_thick",
    "to": "finish_floor_floor_polyurethane_thick"
  },
  {
    "from": "floor_polyurethane_matte",
    "to": "finish_floor_floor_polyurethane_matte"
  },
  {
    "from": "floor_polymer_primer",
    "to": "finish_floor_floor_polymer_primer"
  },
  {
    "from": "floor_polymer_topcoat",
    "to": "finish_floor_floor_polymer_topcoat"
  },
  {
    "from": "floor_polymer_repair",
    "to": "finish_floor_floor_polymer_repair"
  },
  {
    "from": "floor_polymer_expansion",
    "to": "finish_floor_floor_polymer_expansion"
  },
  {
    "from": "floor_microcement",
    "to": "finish_floor_floor_microcement"
  },
  {
    "from": "floor_microcement_primer",
    "to": "finish_floor_floor_microcement_primer"
  },
  {
    "from": "floor_microcement_topcoat",
    "to": "finish_floor_floor_microcement_topcoat"
  },
  {
    "from": "floor_microcement_repair",
    "to": "finish_floor_floor_microcement_repair"
  },
  {
    "from": "floor_terrazzo",
    "to": "finish_floor_floor_terrazzo"
  },
  {
    "from": "floor_terrazzo_grinding",
    "to": "finish_floor_floor_terrazzo_grinding"
  },
  {
    "from": "floor_terrazzo_repair",
    "to": "finish_floor_floor_terrazzo_repair"
  },
  {
    "from": "floor_warm_cover",
    "to": "finish_floor_floor_warm_cover"
  },
  {
    "from": "floor_decorative_primer",
    "to": "finish_floor_floor_decorative_primer"
  },
  {
    "from": "floor_decorative_expansion",
    "to": "finish_floor_floor_decorative_expansion"
  },
  {
    "from": "floor_spc_diag",
    "to": "finish_floor_floor_spc_diag"
  },
  {
    "from": "floor_spc_herringbone",
    "to": "finish_floor_floor_spc_herringbone"
  },
  {
    "from": "floor_spc_offset",
    "to": "finish_floor_floor_spc_offset"
  },
  {
    "from": "floor_spc_underlay",
    "to": "finish_floor_floor_spc_underlay"
  },
  {
    "from": "floor_spc_vapor_barrier",
    "to": "finish_floor_floor_spc_vapor_barrier"
  },
  {
    "from": "floor_spc_base_prep",
    "to": "finish_floor_floor_spc_base_prep"
  },
  {
    "from": "floor_spc_threshold",
    "to": "finish_floor_floor_spc_threshold"
  },
  {
    "from": "floor_spc_plinth",
    "to": "finish_floor_floor_spc_plinth"
  },
  {
    "from": "floor_spc_repair_plank",
    "to": "finish_floor_floor_spc_repair_plank"
  },
  {
    "from": "floor_spc_cutouts",
    "to": "finish_floor_floor_spc_cutouts"
  },
  {
    "from": "floor_vinyl_glue",
    "to": "finish_floor_floor_vinyl_glue"
  },
  {
    "from": "floor_lvt_diag",
    "to": "finish_floor_floor_lvt_diag"
  },
  {
    "from": "floor_lvt_herringbone",
    "to": "finish_floor_floor_lvt_herringbone"
  },
  {
    "from": "floor_lvt_pattern",
    "to": "finish_floor_floor_lvt_pattern"
  },
  {
    "from": "floor_vinyl_primer",
    "to": "finish_floor_floor_vinyl_primer"
  },
  {
    "from": "floor_vinyl_base_prep",
    "to": "finish_floor_floor_vinyl_base_prep"
  },
  {
    "from": "floor_lvt_self_adhesive",
    "to": "finish_floor_floor_lvt_self_adhesive"
  },
  {
    "from": "floor_lvt_threshold",
    "to": "finish_floor_floor_lvt_threshold"
  },
  {
    "from": "floor_lvt_plinth",
    "to": "finish_floor_floor_lvt_plinth"
  },
  {
    "from": "floor_lvt_repair_tile",
    "to": "finish_floor_floor_lvt_repair_tile"
  },
  {
    "from": "floor_lvt_seam_weld",
    "to": "finish_floor_floor_lvt_seam_weld"
  },
  {
    "from": "floor_spc_small_module",
    "to": "finish_floor_floor_spc_small_module"
  },
  {
    "from": "floor_vinyl_roll_glue",
    "to": "finish_floor_floor_vinyl_roll_glue"
  },
  {
    "from": "floor_vinyl_roll_free",
    "to": "finish_floor_floor_vinyl_roll_free"
  },
  {
    "from": "floor_vinyl_roll_weld",
    "to": "finish_floor_floor_vinyl_roll_weld"
  },
  {
    "from": "floor_vinyl_roll_cove",
    "to": "finish_floor_floor_vinyl_roll_cove"
  },
  {
    "from": "floor_vinyl_roll_primer",
    "to": "finish_floor_floor_vinyl_roll_primer"
  },
  {
    "from": "floor_vinyl_roll_base_prep",
    "to": "finish_floor_floor_vinyl_roll_base_prep"
  },
  {
    "from": "floor_vinyl_roll_threshold",
    "to": "finish_floor_floor_vinyl_roll_threshold"
  },
  {
    "from": "floor_vinyl_roll_repair",
    "to": "finish_floor_floor_vinyl_roll_repair"
  },
  {
    "from": "wall_glass_fiber",
    "to": "finish_wall_prep_wall_glass_fiber"
  },
  {
    "from": "wall_paint_masking",
    "to": "finish_wall_prep_wall_paint_masking"
  },
  {
    "from": "wall_paint_outlet_mask",
    "to": "finish_wall_prep_wall_paint_outlet_mask"
  },
  {
    "from": "wall_paint_3layers",
    "to": "finish_wall_man_wall_paint_3layers"
  },
  {
    "from": "wall_paint_premium",
    "to": "finish_wall_man_wall_paint_premium"
  },
  {
    "from": "wall_paint_moisture_resist",
    "to": "finish_wall_man_wall_paint_moisture_resist"
  },
  {
    "from": "wall_paint_facade",
    "to": "finish_wall_man_wall_paint_facade"
  },
  {
    "from": "wall_paint_antiseptic",
    "to": "finish_wall_man_wall_paint_antiseptic"
  },
  {
    "from": "wall_paint_color_change",
    "to": "finish_wall_man_wall_paint_color_change"
  },
  {
    "from": "wall_paint_stripe_geometry",
    "to": "finish_wall_man_wall_paint_stripe_geometry"
  },
  {
    "from": "wall_paint_two_color",
    "to": "finish_wall_man_wall_paint_two_color"
  },
  {
    "from": "wall_paint_accent",
    "to": "finish_wall_man_wall_paint_accent"
  },
  {
    "from": "wall_paint_texture",
    "to": "finish_wall_man_wall_paint_texture"
  },
  {
    "from": "wall_paint_metallic",
    "to": "finish_wall_man_wall_paint_metallic"
  },
  {
    "from": "wall_paint_chalk",
    "to": "finish_wall_man_wall_paint_chalk"
  },
  {
    "from": "wall_paint_luminescent",
    "to": "finish_wall_man_wall_paint_luminescent"
  },
  {
    "from": "wall_paint_mech",
    "to": "finish_wall_mech_wall_paint_mech"
  },
  {
    "from": "wall_paint_3layers_mech",
    "to": "finish_wall_mech_wall_paint_3layers_mech"
  },
  {
    "from": "wall_paint_premium_mech",
    "to": "finish_wall_mech_wall_paint_premium_mech"
  },
  {
    "from": "wall_venetian_plaster",
    "to": "finish_wall_wall_venetian_plaster"
  },
  {
    "from": "wall_decorative_multilayer",
    "to": "finish_wall_wall_decorative_multilayer"
  },
  {
    "from": "wall_decorative_wax",
    "to": "finish_wall_wall_decorative_wax"
  },
  {
    "from": "wall_mdf_panels",
    "to": "finish_wall_wall_mdf_panels"
  },
  {
    "from": "wall_mdf_panels_frame",
    "to": "finish_wall_wall_mdf_panels_frame"
  },
  {
    "from": "wall_pvc_panels",
    "to": "finish_wall_wall_pvc_panels"
  },
  {
    "from": "wall_slat",
    "to": "finish_wall_wall_slat"
  },
  {
    "from": "wall_slat_vertical",
    "to": "finish_wall_wall_slat_vertical"
  },
  {
    "from": "wall_slat_horizontal",
    "to": "finish_wall_wall_slat_horizontal"
  },
  {
    "from": "wall_soft_panels",
    "to": "finish_wall_wall_soft_panels"
  },
  {
    "from": "wall_3d_gypsum",
    "to": "finish_wall_wall_3d_gypsum"
  },
  {
    "from": "wall_3d_polymer",
    "to": "finish_wall_wall_3d_polymer"
  },
  {
    "from": "wall_mirror_panels",
    "to": "finish_wall_wall_mirror_panels"
  },
  {
    "from": "wall_glass_panels",
    "to": "finish_wall_wall_glass_panels"
  },
  {
    "from": "wall_stone_panels",
    "to": "finish_wall_wall_stone_panels"
  },
  {
    "from": "wall_panel_subsystem",
    "to": "finish_wall_wall_panel_subsystem"
  },
  {
    "from": "wall_panel_cutouts",
    "to": "finish_wall_wall_panel_cutouts"
  },
  {
    "from": "wall_panel_joint_seal",
    "to": "finish_wall_wall_panel_joint_seal"
  },
  {
    "from": "wall_panel_corner_profile",
    "to": "finish_wall_wall_panel_corner_profile"
  },
  {
    "from": "wall_panel_repair",
    "to": "finish_wall_wall_panel_repair"
  },
  {
    "from": "wall_cork",
    "to": "finish_wall_wall_cork"
  },
  {
    "from": "wall_cork_glue",
    "to": "finish_wall_wall_cork_glue"
  },
  {
    "from": "wall_cork_primer",
    "to": "finish_wall_wall_cork_primer"
  },
  {
    "from": "wall_cork_lacquer",
    "to": "finish_wall_wall_cork_lacquer"
  },
  {
    "from": "wall_cork_oil",
    "to": "finish_wall_wall_cork_oil"
  },
  {
    "from": "wall_cork_repair",
    "to": "finish_wall_wall_cork_repair"
  },
  {
    "from": "wall_laminate",
    "to": "finish_wall_wall_laminate"
  },
  {
    "from": "wall_wood_board",
    "to": "finish_wall_wall_wood_board"
  },
  {
    "from": "wall_wood_board_frame",
    "to": "finish_wall_wall_wood_board_frame"
  },
  {
    "from": "wall_wood_lacquer",
    "to": "finish_wall_wall_wood_lacquer"
  },
  {
    "from": "wall_wood_oil",
    "to": "finish_wall_wall_wood_oil"
  },
  {
    "from": "wall_wood_sanding",
    "to": "finish_wall_wall_wood_sanding"
  },
  {
    "from": "wall_wood_antiseptic",
    "to": "finish_wall_wall_wood_antiseptic"
  },
  {
    "from": "wall_wood_repair",
    "to": "finish_wall_wall_wood_repair"
  },
  {
    "from": "wall_molding",
    "to": "finish_wall_wall_molding"
  },
  {
    "from": "wall_decor_light_profile",
    "to": "finish_wall_wall_decor_light_profile"
  },
  {
    "from": "wall_corner_profile",
    "to": "finish_wall_wall_corner_profile"
  },
  {
    "from": "wall_arch_profile",
    "to": "finish_wall_wall_arch_profile"
  },
  {
    "from": "wall_niche_profile",
    "to": "finish_wall_wall_niche_profile"
  },
  {
    "from": "wall_sill",
    "to": "finish_wall_wall_sill"
  },
  {
    "from": "wall_sill_stone",
    "to": "finish_wall_wall_sill_stone"
  },
  {
    "from": "wall_decor_mirror_mount",
    "to": "finish_wall_wall_decor_mirror_mount"
  },
  {
    "from": "wall_decor_panel_art",
    "to": "finish_wall_wall_decor_panel_art"
  },
  {
    "from": "wall_expansion_joint",
    "to": "finish_wall_wall_expansion_joint"
  },
  {
    "from": "wall_sealing_joint",
    "to": "finish_wall_wall_sealing_joint"
  },
  {
    "from": "wall_decor_led_niche",
    "to": "finish_wall_wall_decor_led_niche"
  },
  {
    "from": "wall_antifungal",
    "to": "finish_wall_wall_antifungal"
  },
  {
    "from": "wall_cover_dismantle",
    "to": "finish_wall_wall_cover_dismantle"
  },
  {
    "from": "wall_primer_before_tile",
    "to": "finish_wall_wall_primer_before_tile"
  },
  {
    "from": "wall_crack_repair",
    "to": "finish_wall_wall_crack_repair"
  },
  {
    "from": "wall_leveling_plaster",
    "to": "finish_wall_wall_leveling_plaster"
  },
  {
    "from": "wall_leveling_cement",
    "to": "finish_wall_wall_leveling_cement"
  },
  {
    "from": "wall_leveling_gkl",
    "to": "finish_wall_wall_leveling_gkl"
  },
  {
    "from": "wall_leveling_gkl_glue",
    "to": "finish_wall_wall_leveling_gkl_glue"
  },
  {
    "from": "wall_waterproof_coat",
    "to": "finish_wall_wall_waterproof_coat"
  },
  {
    "from": "wall_waterproof_membrane",
    "to": "finish_wall_wall_waterproof_membrane"
  },
  {
    "from": "wall_sound_insulation",
    "to": "finish_wall_wall_sound_insulation"
  },
  {
    "from": "wall_masking_and_protection",
    "to": "finish_wall_wall_masking_and_protection"
  },
  {
    "from": "wall_wallpaper_vinyl",
    "to": "finish_wall_wall_wallpaper_vinyl"
  },
  {
    "from": "wall_wallpaper_paper",
    "to": "finish_wall_wall_wallpaper_paper"
  },
  {
    "from": "wall_wallpaper_textile",
    "to": "finish_wall_wall_wallpaper_textile"
  },
  {
    "from": "wall_wallpaper_grasscloth",
    "to": "finish_wall_wall_wallpaper_grasscloth"
  },
  {
    "from": "wall_wallpaper_3d",
    "to": "finish_wall_wall_wallpaper_3d"
  },
  {
    "from": "wall_wallpaper_pattern_match",
    "to": "finish_wall_wall_wallpaper_pattern_match"
  },
  {
    "from": "wall_wallpaper_corner_complex",
    "to": "finish_wall_wall_wallpaper_corner_complex"
  },
  {
    "from": "wall_wallpaper_ceiling_border",
    "to": "finish_wall_wall_wallpaper_ceiling_border"
  },
  {
    "from": "wall_wallpaper_base_prep",
    "to": "finish_wall_wall_wallpaper_base_prep"
  },
  {
    "from": "wall_wallpaper_primer",
    "to": "finish_wall_wall_wallpaper_primer"
  },
  {
    "from": "wall_wallpaper_remove_old",
    "to": "finish_wall_wall_wallpaper_remove_old"
  },
  {
    "from": "wall_wallpaper_seam_repair",
    "to": "finish_wall_wall_wallpaper_seam_repair"
  },
  {
    "from": "wall_wallpaper_repair",
    "to": "finish_wall_wall_wallpaper_repair"
  },
  {
    "from": "wall_wallpaper_outlet_cutout",
    "to": "finish_wall_wall_wallpaper_outlet_cutout"
  },
  {
    "from": "wall_photo_wallpaper",
    "to": "finish_wall_wall_photo_wallpaper"
  },
  {
    "from": "wall_photo_wallpaper_vinyl",
    "to": "finish_wall_wall_photo_wallpaper_vinyl"
  },
  {
    "from": "wall_photo_wallpaper_canvas",
    "to": "finish_wall_wall_photo_wallpaper_canvas"
  },
  {
    "from": "wall_photo_wallpaper_panel",
    "to": "finish_wall_wall_photo_wallpaper_panel"
  },
  {
    "from": "wall_photo_wallpaper_seamless",
    "to": "finish_wall_wall_photo_wallpaper_seamless"
  },
  {
    "from": "wall_photo_wallpaper_ceiling",
    "to": "finish_wall_wall_photo_wallpaper_ceiling"
  },
  {
    "from": "wall_photo_wallpaper_base_prep",
    "to": "finish_wall_wall_photo_wallpaper_base_prep"
  },
  {
    "from": "wall_photo_wallpaper_primer",
    "to": "finish_wall_wall_photo_wallpaper_primer"
  },
  {
    "from": "wall_photo_wallpaper_complex",
    "to": "finish_wall_wall_photo_wallpaper_complex"
  },
  {
    "from": "wall_photo_wallpaper_remove",
    "to": "finish_wall_wall_photo_wallpaper_remove"
  },
  {
    "from": "wall_photo_wallpaper_repair",
    "to": "finish_wall_wall_photo_wallpaper_repair"
  },
  {
    "from": "wall_photo_wallpaper_outlet",
    "to": "finish_wall_wall_photo_wallpaper_outlet"
  },
  {
    "from": "wall_ceramic_medium",
    "to": "finish_wall_wall_ceramic_medium"
  },
  {
    "from": "wall_ceramic_diagonal",
    "to": "finish_wall_wall_ceramic_diagonal"
  },
  {
    "from": "wall_ceramic_pattern",
    "to": "finish_wall_wall_ceramic_pattern"
  },
  {
    "from": "wall_ceramic_niche",
    "to": "finish_wall_wall_ceramic_niche"
  },
  {
    "from": "wall_ceramic_waterproof",
    "to": "finish_wall_wall_ceramic_waterproof"
  },
  {
    "from": "wall_ceramic_leveling_system",
    "to": "finish_wall_wall_ceramic_leveling_system"
  },
  {
    "from": "wall_ceramic_grout",
    "to": "finish_wall_wall_ceramic_grout"
  },
  {
    "from": "wall_ceramic_grout_epoxy",
    "to": "finish_wall_wall_ceramic_grout_epoxy"
  },
  {
    "from": "wall_ceramic_corner_profile",
    "to": "finish_wall_wall_ceramic_corner_profile"
  },
  {
    "from": "wall_ceramic_sealing",
    "to": "finish_wall_wall_ceramic_sealing"
  },
  {
    "from": "wall_ceramic_repair_tile",
    "to": "finish_wall_wall_ceramic_repair_tile"
  },
  {
    "from": "wall_ceramic_base_prep",
    "to": "finish_wall_wall_ceramic_base_prep"
  },
  {
    "from": "wall_porcelain_large",
    "to": "finish_wall_wall_porcelain_large"
  },
  {
    "from": "wall_porcelain_slab",
    "to": "finish_wall_wall_porcelain_slab"
  },
  {
    "from": "wall_porcelain_diagonal",
    "to": "finish_wall_wall_porcelain_diagonal"
  },
  {
    "from": "wall_porcelain_pattern",
    "to": "finish_wall_wall_porcelain_pattern"
  },
  {
    "from": "wall_porcelain_herringbone",
    "to": "finish_wall_wall_porcelain_herringbone"
  },
  {
    "from": "wall_porcelain_niche",
    "to": "finish_wall_wall_porcelain_niche"
  },
  {
    "from": "wall_porcelain_waterproof",
    "to": "finish_wall_wall_porcelain_waterproof"
  },
  {
    "from": "wall_porcelain_leveling_system",
    "to": "finish_wall_wall_porcelain_leveling_system"
  },
  {
    "from": "wall_porcelain_grout",
    "to": "finish_wall_wall_porcelain_grout"
  },
  {
    "from": "wall_porcelain_grout_epoxy",
    "to": "finish_wall_wall_porcelain_grout_epoxy"
  },
  {
    "from": "wall_porcelain_corner_profile",
    "to": "finish_wall_wall_porcelain_corner_profile"
  },
  {
    "from": "wall_porcelain_sealing",
    "to": "finish_wall_wall_porcelain_sealing"
  },
  {
    "from": "wall_porcelain_repair_tile",
    "to": "finish_wall_wall_porcelain_repair_tile"
  },
  {
    "from": "wall_porcelain_base_prep",
    "to": "finish_wall_wall_porcelain_base_prep"
  },
  {
    "from": "wall_mosaic_stone",
    "to": "finish_wall_wall_mosaic_stone"
  },
  {
    "from": "wall_mosaic_metal",
    "to": "finish_wall_wall_mosaic_metal"
  },
  {
    "from": "wall_mosaic_pattern",
    "to": "finish_wall_wall_mosaic_pattern"
  },
  {
    "from": "wall_mosaic_border",
    "to": "finish_wall_wall_mosaic_border"
  },
  {
    "from": "wall_mosaic_niche",
    "to": "finish_wall_wall_mosaic_niche"
  },
  {
    "from": "wall_mosaic_waterproof",
    "to": "finish_wall_wall_mosaic_waterproof"
  },
  {
    "from": "wall_mosaic_grout",
    "to": "finish_wall_wall_mosaic_grout"
  },
  {
    "from": "wall_mosaic_grout_epoxy",
    "to": "finish_wall_wall_mosaic_grout_epoxy"
  },
  {
    "from": "wall_mosaic_sealing",
    "to": "finish_wall_wall_mosaic_sealing"
  },
  {
    "from": "wall_mosaic_base_prep",
    "to": "finish_wall_wall_mosaic_base_prep"
  },
  {
    "from": "wall_mosaic_repair",
    "to": "finish_wall_wall_mosaic_repair"
  },
  {
    "from": "ceiling_stretch_fabric",
    "to": "finish_ceil_ceiling_stretch_fabric"
  },
  {
    "from": "ceiling_stretch_shadow",
    "to": "finish_ceil_ceiling_stretch_shadow"
  },
  {
    "from": "ceiling_stretch_multilevel",
    "to": "finish_ceil_ceiling_stretch_multilevel"
  },
  {
    "from": "ceiling_stretch_solder_joint",
    "to": "finish_ceil_ceiling_stretch_solder_joint"
  },
  {
    "from": "ceiling_stretch_print",
    "to": "finish_ceil_ceiling_stretch_print"
  },
  {
    "from": "ceiling_stretch_3d",
    "to": "finish_ceil_ceiling_stretch_3d"
  },
  {
    "from": "ceiling_stretch_satin",
    "to": "finish_ceil_ceiling_stretch_satin"
  },
  {
    "from": "ceiling_stretch_light_lines",
    "to": "finish_ceil_ceiling_stretch_light_lines"
  },
  {
    "from": "ceiling_stretch_curtain_niche",
    "to": "finish_ceil_ceiling_stretch_curtain_niche"
  },
  {
    "from": "ceiling_stretch_spot_cutout",
    "to": "finish_ceil_ceiling_stretch_spot_cutout"
  },
  {
    "from": "ceiling_stretch_dismantle",
    "to": "finish_ceil_ceiling_stretch_dismantle"
  },
  {
    "from": "ceiling_stretch_repair",
    "to": "finish_ceil_ceiling_stretch_repair"
  },
  {
    "from": "ceiling_gk_multilevel",
    "to": "finish_ceil_ceiling_gk_multilevel"
  },
  {
    "from": "ceiling_gk_curved",
    "to": "finish_ceil_ceiling_gk_curved"
  },
  {
    "from": "ceiling_gk_box",
    "to": "finish_ceil_ceiling_gk_box"
  },
  {
    "from": "ceiling_gk_arch",
    "to": "finish_ceil_ceiling_gk_arch"
  },
  {
    "from": "ceiling_gk_niche",
    "to": "finish_ceil_ceiling_gk_niche"
  },
  {
    "from": "ceiling_gk_sound",
    "to": "finish_ceil_ceiling_gk_sound"
  },
  {
    "from": "ceiling_gk_moisture",
    "to": "finish_ceil_ceiling_gk_moisture"
  },
  {
    "from": "ceiling_gk_putty_paint",
    "to": "finish_ceil_ceiling_gk_putty_paint"
  },
  {
    "from": "ceiling_gk_tape_putty",
    "to": "finish_ceil_ceiling_gk_tape_putty"
  },
  {
    "from": "ceiling_gk_spot_cutout",
    "to": "finish_ceil_ceiling_gk_spot_cutout"
  },
  {
    "from": "ceiling_gk_dismantle",
    "to": "finish_ceil_ceiling_gk_dismantle"
  },
  {
    "from": "ceiling_gk_repair",
    "to": "finish_ceil_ceiling_gk_repair"
  },
  {
    "from": "ceiling_acoustic",
    "to": "finish_ceil_ceiling_acoustic"
  },
  {
    "from": "ceiling_suspended_hanger_dense",
    "to": "finish_ceil_ceiling_suspended_hanger_dense"
  },
  {
    "from": "ceiling_suspended_frame",
    "to": "finish_ceil_ceiling_suspended_frame"
  },
  {
    "from": "ceiling_suspended_spot_cutout",
    "to": "finish_ceil_ceiling_suspended_spot_cutout"
  },
  {
    "from": "ceiling_suspended_vent_cutout",
    "to": "finish_ceil_ceiling_suspended_vent_cutout"
  },
  {
    "from": "ceiling_suspended_dismantle",
    "to": "finish_ceil_ceiling_suspended_dismantle"
  },
  {
    "from": "ceiling_suspended_tile_replace",
    "to": "finish_ceil_ceiling_suspended_tile_replace"
  },
  {
    "from": "ceiling_paint_3layers",
    "to": "finish_ceil_man_ceiling_paint_3layers"
  },
  {
    "from": "ceiling_paint_premium",
    "to": "finish_ceil_man_ceiling_paint_premium"
  },
  {
    "from": "ceiling_paint_moisture_resist",
    "to": "finish_ceil_man_ceiling_paint_moisture_resist"
  },
  {
    "from": "ceiling_paint_mech",
    "to": "finish_ceil_mech_ceiling_paint_mech"
  },
  {
    "from": "ceiling_paint_3layers_mech",
    "to": "finish_ceil_mech_ceiling_paint_3layers_mech"
  },
  {
    "from": "ceiling_paint_premium_mech",
    "to": "finish_ceil_mech_ceiling_paint_premium_mech"
  },
  {
    "from": "ceiling_decorative_plaster",
    "to": "finish_ceil_ceiling_decorative_plaster"
  },
  {
    "from": "ceiling_decorative",
    "to": "finish_ceil_ceiling_decorative"
  },
  {
    "from": "ceiling_rustic_joint",
    "to": "finish_ceil_ceiling_rustic_joint"
  },
  {
    "from": "ceiling_paint_remove_old",
    "to": "finish_ceil_ceiling_paint_remove_old"
  },
  {
    "from": "ceiling_wood_slat",
    "to": "finish_ceil_ceiling_wood_slat"
  },
  {
    "from": "ceiling_wood_panel",
    "to": "finish_ceil_ceiling_wood_panel"
  },
  {
    "from": "ceiling_wood_frame",
    "to": "finish_ceil_ceiling_wood_frame"
  },
  {
    "from": "ceiling_beam_decor",
    "to": "finish_ceil_ceiling_beam_decor"
  },
  {
    "from": "ceiling_coffered",
    "to": "finish_ceil_ceiling_coffered"
  },
  {
    "from": "ceiling_wood_lacquer",
    "to": "finish_ceil_ceiling_wood_lacquer"
  },
  {
    "from": "ceiling_wood_oil",
    "to": "finish_ceil_ceiling_wood_oil"
  },
  {
    "from": "ceiling_wood_antiseptic",
    "to": "finish_ceil_ceiling_wood_antiseptic"
  },
  {
    "from": "ceiling_wood_sanding",
    "to": "finish_ceil_ceiling_wood_sanding"
  },
  {
    "from": "ceiling_wood_repair",
    "to": "finish_ceil_ceiling_wood_repair"
  },
  {
    "from": "ceiling_3d_panel",
    "to": "finish_ceil_ceiling_3d_panel"
  },
  {
    "from": "ceiling_mirror_panel",
    "to": "finish_ceil_ceiling_mirror_panel"
  },
  {
    "from": "ceiling_molding",
    "to": "finish_ceil_ceiling_molding"
  },
  {
    "from": "ceiling_molding_gypsum",
    "to": "finish_ceil_ceiling_molding_gypsum"
  },
  {
    "from": "ceiling_cornice_hidden",
    "to": "finish_ceil_ceiling_cornice_hidden"
  },
  {
    "from": "ceiling_shadow_profile",
    "to": "finish_ceil_ceiling_shadow_profile"
  },
  {
    "from": "ceiling_led_profile",
    "to": "finish_ceil_ceiling_led_profile"
  },
  {
    "from": "ceiling_led_strip_install",
    "to": "finish_ceil_ceiling_led_strip_install"
  },
  {
    "from": "ceiling_rosette",
    "to": "finish_ceil_ceiling_rosette"
  },
  {
    "from": "ceiling_hatch_hidden",
    "to": "finish_ceil_ceiling_hatch_hidden"
  },
  {
    "from": "ceiling_spot_cutout",
    "to": "finish_ceil_ceiling_spot_cutout"
  },
  {
    "from": "ceiling_vent_cutout",
    "to": "finish_ceil_ceiling_vent_cutout"
  },
  {
    "from": "ceiling_molding_dismantle",
    "to": "finish_ceil_ceiling_molding_dismantle"
  },
  {
    "from": "ceiling_molding_repair",
    "to": "finish_ceil_ceiling_molding_repair"
  },
  {
    "from": "ceiling_antifungal_fin",
    "to": "finish_ceil_ceiling_antifungal_fin"
  },
  {
    "from": "ceiling_cover_dismantle",
    "to": "finish_ceil_ceiling_cover_dismantle"
  },
  {
    "from": "ceiling_crack_repair",
    "to": "finish_ceil_ceiling_crack_repair"
  },
  {
    "from": "ceiling_leveling_plaster",
    "to": "finish_ceil_ceiling_leveling_plaster"
  },
  {
    "from": "ceiling_leveling_self",
    "to": "finish_ceil_ceiling_leveling_self"
  },
  {
    "from": "ceiling_waterproof_coat",
    "to": "finish_ceil_ceiling_waterproof_coat"
  },
  {
    "from": "ceiling_sound_insulation",
    "to": "finish_ceil_ceiling_sound_insulation"
  },
  {
    "from": "ceiling_sealing_joint",
    "to": "finish_ceil_ceiling_sealing_joint"
  },
  {
    "from": "ceiling_masking_and_protection",
    "to": "finish_ceil_ceiling_masking_and_protection"
  },
  {
    "from": "door_install",
    "to": "finish_open_door_install"
  },
  {
    "from": "door_install_with_trim",
    "to": "finish_open_door_install_with_trim"
  },
  {
    "from": "door_install_tall",
    "to": "finish_open_door_install_tall"
  },
  {
    "from": "door_install_hidden",
    "to": "finish_open_door_install_hidden"
  },
  {
    "from": "door_install_hidden_prep",
    "to": "finish_open_door_install_hidden_prep"
  },
  {
    "from": "door_install_hidden_tall",
    "to": "finish_open_door_install_hidden_tall"
  },
  {
    "from": "door_install_hidden_double",
    "to": "finish_open_door_install_hidden_double"
  },
  {
    "from": "door_install_double",
    "to": "finish_open_door_install_double"
  },
  {
    "from": "door_install_double_trim",
    "to": "finish_open_door_install_double_trim"
  },
  {
    "from": "door_install_sliding",
    "to": "finish_open_door_install_sliding"
  },
  {
    "from": "door_portal",
    "to": "finish_open_door_portal"
  },
  {
    "from": "door_trim",
    "to": "finish_open_door_trim"
  },
  {
    "from": "door_trim_one_side",
    "to": "finish_open_door_trim_one_side"
  },
  {
    "from": "door_frame_reinforce",
    "to": "finish_open_door_frame_reinforce"
  },
  {
    "from": "handle_install",
    "to": "finish_open_handle_install"
  },
  {
    "from": "handle_install_simple",
    "to": "finish_open_handle_install_simple"
  },
  {
    "from": "lock_install",
    "to": "finish_open_lock_install"
  },
  {
    "from": "lock_install_latch",
    "to": "finish_open_lock_install_latch"
  },
  {
    "from": "closer_install",
    "to": "finish_open_closer_install"
  },
  {
    "from": "door_threshold_install",
    "to": "finish_open_door_threshold_install"
  },
  {
    "from": "door_seal_install",
    "to": "finish_open_door_seal_install"
  },
  {
    "from": "door_hardware_complex",
    "to": "finish_open_door_hardware_complex"
  },
  {
    "from": "window_install",
    "to": "finish_open_window_install"
  },
  {
    "from": "window_install_large",
    "to": "finish_open_window_install_large"
  },
  {
    "from": "window_install_panoramic",
    "to": "finish_open_window_install_panoramic"
  },
  {
    "from": "window_trim",
    "to": "finish_open_window_trim"
  },
  {
    "from": "window_trim_inner",
    "to": "finish_open_window_trim_inner"
  },
  {
    "from": "drip_install",
    "to": "finish_open_drip_install"
  },
  {
    "from": "window_install_aluminum",
    "to": "finish_open_window_install_aluminum"
  },
  {
    "from": "window_install_aluminum_large",
    "to": "finish_open_window_install_aluminum_large"
  },
  {
    "from": "window_install_aluminum_panoramic",
    "to": "finish_open_window_install_aluminum_panoramic"
  },
  {
    "from": "window_install_aluminum_sliding",
    "to": "finish_open_window_install_aluminum_sliding"
  },
  {
    "from": "window_install_wood",
    "to": "finish_open_window_install_wood"
  },
  {
    "from": "window_install_wood_large",
    "to": "finish_open_window_install_wood_large"
  },
  {
    "from": "window_install_wood_panoramic",
    "to": "finish_open_window_install_wood_panoramic"
  },
  {
    "from": "windowsill_install_opening",
    "to": "finish_open_windowsill_install_opening"
  },
  {
    "from": "window_slope_sandwich",
    "to": "finish_open_window_slope_sandwich"
  },
  {
    "from": "window_slope_plaster",
    "to": "finish_open_window_slope_plaster"
  },
  {
    "from": "window_slope_gkl",
    "to": "finish_open_window_slope_gkl"
  },
  {
    "from": "window_hardware_adjust",
    "to": "finish_open_window_hardware_adjust"
  },
  {
    "from": "window_seal_replace",
    "to": "finish_open_window_seal_replace"
  },
  {
    "from": "window_mosquito_install",
    "to": "finish_open_window_mosquito_install"
  },
  {
    "from": "balcony_install",
    "to": "finish_open_balcony_install"
  },
  {
    "from": "balcony_install_large",
    "to": "finish_open_balcony_install_large"
  },
  {
    "from": "balcony_install_panoramic",
    "to": "finish_open_balcony_install_panoramic"
  },
  {
    "from": "balcony_warm_glazing",
    "to": "finish_open_balcony_warm_glazing"
  },
  {
    "from": "balcony_warm_glazing_large",
    "to": "finish_open_balcony_warm_glazing_large"
  },
  {
    "from": "balcony_warm_glazing_panoramic",
    "to": "finish_open_balcony_warm_glazing_panoramic"
  },
  {
    "from": "balcony_cold_glazing",
    "to": "finish_open_balcony_cold_glazing"
  },
  {
    "from": "balcony_cold_glazing_large",
    "to": "finish_open_balcony_cold_glazing_large"
  },
  {
    "from": "balcony_cold_glazing_panoramic",
    "to": "finish_open_balcony_cold_glazing_panoramic"
  },
  {
    "from": "balcony_door_block",
    "to": "finish_open_balcony_door_block"
  },
  {
    "from": "balcony_door_block_large",
    "to": "finish_open_balcony_door_block_large"
  },
  {
    "from": "balcony_sliding_portal",
    "to": "finish_open_balcony_sliding_portal"
  },
  {
    "from": "balcony_sill_install",
    "to": "finish_open_balcony_sill_install"
  },
  {
    "from": "balcony_drain_install",
    "to": "finish_open_balcony_drain_install"
  },
  {
    "from": "balcony_trim",
    "to": "finish_open_balcony_trim"
  },
  {
    "from": "balcony_trim_inner",
    "to": "finish_open_balcony_trim_inner"
  },
  {
    "from": "balcony_insulation_joint",
    "to": "finish_open_balcony_insulation_joint"
  },
  {
    "from": "stair_concrete_formwork",
    "to": "finish_stair_stair_concrete_formwork"
  },
  {
    "from": "stair_concrete_rebar",
    "to": "finish_stair_stair_concrete_rebar"
  },
  {
    "from": "stair_concrete_pour",
    "to": "finish_stair_stair_concrete_pour"
  },
  {
    "from": "stair_frame_metal_straight",
    "to": "finish_stair_stair_frame_metal_straight"
  },
  {
    "from": "stair_frame_metal_turn",
    "to": "finish_stair_stair_frame_metal_turn"
  },
  {
    "from": "stair_frame_metal_spiral",
    "to": "finish_stair_stair_frame_metal_spiral"
  },
  {
    "from": "stair_step_install_wood",
    "to": "finish_stair_stair_step_install_wood"
  },
  {
    "from": "stair_riser_install_wood",
    "to": "finish_stair_stair_riser_install_wood"
  },
  {
    "from": "stair_winder_steps_install",
    "to": "finish_stair_stair_winder_steps_install"
  },
  {
    "from": "stair_landing_install",
    "to": "finish_stair_stair_landing_install"
  },
  {
    "from": "stair_step_install_stone",
    "to": "finish_stair_stair_step_install_stone"
  },
  {
    "from": "stair_install_composite_on_metal_step_w12",
    "to": "finish_stair_stair_install_composite_on_metal_step_w12"
  },
  {
    "from": "stair_install_composite_on_metal_step_w15",
    "to": "finish_stair_stair_install_composite_on_metal_step_w15"
  },
  {
    "from": "stair_cladding_porcelain_standard",
    "to": "finish_stair_stair_cladding_porcelain_standard"
  },
  {
    "from": "stair_cladding_porcelain_large",
    "to": "finish_stair_stair_cladding_porcelain_large"
  },
  {
    "from": "stair_cladding_ceramic",
    "to": "finish_stair_stair_cladding_ceramic"
  },
  {
    "from": "stair_cladding_tile_nosing",
    "to": "finish_stair_stair_cladding_tile_nosing"
  },
  {
    "from": "stair_cladding_tread_tile",
    "to": "finish_stair_stair_cladding_tread_tile"
  },
  {
    "from": "stair_cladding_riser_tile",
    "to": "finish_stair_stair_cladding_riser_tile"
  },
  {
    "from": "stair_cladding_landing_tile",
    "to": "finish_stair_stair_cladding_landing_tile"
  },
  {
    "from": "stair_cladding_end_profile",
    "to": "finish_stair_stair_cladding_end_profile"
  },
  {
    "from": "stair_anti_slip_strip",
    "to": "finish_stair_stair_anti_slip_strip"
  },
  {
    "from": "stair_cladding_natural_stone",
    "to": "finish_stair_stair_cladding_natural_stone"
  },
  {
    "from": "stair_cladding_granite",
    "to": "finish_stair_stair_cladding_granite"
  },
  {
    "from": "stair_cladding_marble",
    "to": "finish_stair_stair_cladding_marble"
  },
  {
    "from": "stair_cladding_step_stone",
    "to": "finish_stair_stair_cladding_step_stone"
  },
  {
    "from": "stair_cladding_wood_soft",
    "to": "finish_stair_stair_cladding_wood_soft"
  },
  {
    "from": "stair_cladding_wood_hard",
    "to": "finish_stair_stair_cladding_wood_hard"
  },
  {
    "from": "stair_cladding_engineered_board",
    "to": "finish_stair_stair_cladding_engineered_board"
  },
  {
    "from": "stair_cladding_tread_wood",
    "to": "finish_stair_stair_cladding_tread_wood"
  },
  {
    "from": "stair_cladding_riser_wood",
    "to": "finish_stair_stair_cladding_riser_wood"
  },
  {
    "from": "stair_cladding_skirting",
    "to": "finish_stair_stair_cladding_skirting"
  },
  {
    "from": "stair_cladding_metal_sheet",
    "to": "finish_stair_stair_cladding_metal_sheet"
  },
  {
    "from": "stair_cladding_metal_anti_slip",
    "to": "finish_stair_stair_cladding_metal_anti_slip"
  },
  {
    "from": "stair_cladding_composite",
    "to": "finish_stair_stair_cladding_composite"
  },
  {
    "from": "stair_cladding_dpk_tread",
    "to": "finish_stair_stair_cladding_dpk_tread"
  },
  {
    "from": "stair_cladding_terrace_board",
    "to": "finish_stair_stair_cladding_terrace_board"
  },
  {
    "from": "railing_install_wood",
    "to": "finish_stair_railing_install_wood"
  },
  {
    "from": "railing_install_wood_handrail",
    "to": "finish_stair_railing_install_wood_handrail"
  },
  {
    "from": "railing_install_wood_balusters",
    "to": "finish_stair_railing_install_wood_balusters"
  },
  {
    "from": "railing_install_wall_handrail",
    "to": "finish_stair_railing_install_wall_handrail"
  },
  {
    "from": "railing_install_post_wood",
    "to": "finish_stair_railing_install_post_wood"
  },
  {
    "from": "railing_install_baluster_wood_piece",
    "to": "finish_stair_railing_install_baluster_wood_piece"
  },
  {
    "from": "railing_install_metal",
    "to": "finish_stair_railing_install_metal"
  },
  {
    "from": "railing_install_stainless",
    "to": "finish_stair_railing_install_stainless"
  },
  {
    "from": "railing_install_black_metal",
    "to": "finish_stair_railing_install_black_metal"
  },
  {
    "from": "railing_install_handrail_metal",
    "to": "finish_stair_railing_install_handrail_metal"
  },
  {
    "from": "railing_install_handrail_stainless",
    "to": "finish_stair_railing_install_handrail_stainless"
  },
  {
    "from": "railing_install_post_metal",
    "to": "finish_stair_railing_install_post_metal"
  },
  {
    "from": "railing_install_baluster_metal_piece",
    "to": "finish_stair_railing_install_baluster_metal_piece"
  },
  {
    "from": "railing_install_rigel",
    "to": "finish_stair_railing_install_rigel"
  },
  {
    "from": "railing_install_glass",
    "to": "finish_stair_railing_install_glass"
  },
  {
    "from": "railing_install_glass_profile",
    "to": "finish_stair_railing_install_glass_profile"
  },
  {
    "from": "railing_install_glass_point",
    "to": "finish_stair_railing_install_glass_point"
  },
  {
    "from": "railing_install_glass_panel",
    "to": "finish_stair_railing_install_glass_panel"
  },
  {
    "from": "railing_install_forged",
    "to": "finish_stair_railing_install_forged"
  },
  {
    "from": "railing_install_forged_premium",
    "to": "finish_stair_railing_install_forged_premium"
  },
  {
    "from": "railing_install_forged_section",
    "to": "finish_stair_railing_install_forged_section"
  },
  {
    "from": "railing_install_composite",
    "to": "finish_stair_railing_install_composite"
  },
  {
    "from": "railing_install_pvc_handrail",
    "to": "finish_stair_railing_install_pvc_handrail"
  },
  {
    "from": "railing_install_dpk_system",
    "to": "finish_stair_railing_install_dpk_system"
  }
];

// Список файлов для обработки
const filesToProcess = [
  'prices_list.js',
  'calc-core.js',
  'calc-utils.js',
  'demolition.js',
  'calc-init.js',
  'calc-render.js',
  'calc-repair-quest.js',
  'calc-building.js',
  'calc-pricing.js',
  'calc-flow.js'
];

let totalReplacements = 0;

filesToProcess.forEach(filename => {
  const filepath = path.join(__dirname, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  Файл не найден: ${filename}`);
    return;
  }
  
  let content = fs.readFileSync(filepath, 'utf8');
  let fileReplacements = 0;
  
  replacements.forEach(({ from, to }) => {
    // Ищем ID в строках и комментариях
    const patterns = [
      new RegExp(`['"]${from}['"]`, 'g'),
      new RegExp(`workId:\\s*['"]${from}['"]`, 'g'),
      new RegExp(`id:\\s*['"]${from}['"]`, 'g')
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, (match) => match.replace(from, to));
        fileReplacements += matches.length;
      }
    });
  });
  
  if (fileReplacements > 0) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✓ ${filename}: ${fileReplacements} замен`);
    totalReplacements += fileReplacements;
  }
});

console.log(`\n✅ Всего выполнено замен: ${totalReplacements}`);
console.log('⚠️  ВАЖНО: Проверьте изменения и протестируйте код!');
