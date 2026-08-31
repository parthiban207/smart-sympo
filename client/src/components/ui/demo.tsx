import { ParticleTextEffect } from "@/components/ui/interactive-text-particle";

const DemoOne = () => {
  return (
    <ParticleTextEffect
      text="SMARTSYMPO"
      className="absolute top-0 left-0 pointer-events-auto"
      colors={['8b1e24', 'd97706', '2563eb', '059669']}
    />
  );
};

export { DemoOne };
