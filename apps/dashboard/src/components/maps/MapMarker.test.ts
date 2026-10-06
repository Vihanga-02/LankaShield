import { beforeEach, expect, it, vi } from 'vitest';
const lifecycle = vi.hoisted(() => ({
  layout: undefined as (() => void | (() => void)) | undefined,
  removed: false,
  available: true,
  events: [] as string[],
}));
vi.mock('react', () => ({
  useLayoutEffect: (setup: () => void | (() => void)) => {
    lifecycle.layout = setup;
  },
}));
vi.mock('@vis.gl/react-google-maps', () => ({
  useMap: () => (lifecycle.available ? {} : null),
  useMapsLibrary: () => ({
    PinElement: class {
      element = {};
    },
    AdvancedMarkerElement: class {
      constructor(options: { content?: unknown }) {
        expect(options.content).toBeDefined();
      }
      set map(value: unknown) {
        if (!value && lifecycle.removed)
          throw new TypeError("Cannot read properties of undefined (reading 'getRootNode')");
        lifecycle.events.push(value ? 'attach' : 'detach');
      }
      addListener() {
        return { remove: () => lifecycle.events.push('remove listener') };
      }
    },
  }),
}));
import { MapMarker } from './MapMarker';
const mount = () => {
  MapMarker({
    position: { lat: 7, lng: 80 },
    title: 'Location',
    background: 'red',
    borderColor: 'white',
    glyphColor: 'white',
    onClick: () => {},
  });
  return lifecycle.layout!();
};
beforeEach(() => {
  lifecycle.layout = undefined;
  lifecycle.removed = false;
  lifecycle.available = true;
  lifecycle.events = [];
});
it('detaches in layout cleanup before the map passive cleanup removes its container', () => {
  const cleanup = mount();
  expect(cleanup).toBeTypeOf('function');
  cleanup!();
  lifecycle.removed = true;
  expect(lifecycle.events).toEqual(['attach', 'remove listener', 'detach']);
});
it('supports strict-mode setup/cleanup and repeated route mounts', () => {
  for (let i = 0; i < 3; i++) {
    const cleanup = mount();
    cleanup!();
  }
  expect(lifecycle.events.filter((event) => event === 'detach')).toHaveLength(3);
});
it('waits for the map to become available', () => {
  lifecycle.available = false;
  expect(mount()).toBeUndefined();
  expect(lifecycle.events).toEqual([]);
});
