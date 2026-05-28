// Game Constants
export const LANE_POSITIONS = [-4, 0, 4]; // Left, Middle, Right X positions (AI/obstacle spawning)
export const LANE_SWITCH_SPEED = 0.15;
export const TRACK_SEGMENT_LENGTH = 100;
export const TRACK_VISIBLE_SEGMENTS = 8;
export const GRAVITY = -20;
export const MAX_HEALTH = 100;
export const NITRO_MAX = 100;
export const NITRO_REGEN_RATE = 8;
export const NITRO_DRAIN_RATE = 25;
export const NITRO_BOOST_MULTIPLIER = 1.8;
export const COIN_VALUE = 10;
export const OBSTACLE_DAMAGE = { cone: 5, oil: 3, roadblock: 20, truck: 30, car: 15 };
export const CAMERA_OFFSET = { x: 0, y: 5, z: -12 };
export const FOG_NEAR = 50;
export const FOG_FAR = 300;
export const PARTICLE_COUNT = 200;
export const AI_COUNT = 3;
export const FINISH_LINE_COINS = [500, 300, 150, 50];
export const API_BASE = '/api';

// Smooth steering
export const STEER_SPEED = 100;
export const STEER_FRICTION = 0.7;
export const ROAD_HALF_WIDTH = 7;
