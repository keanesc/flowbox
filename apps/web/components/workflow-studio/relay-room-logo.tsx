import Heading from "@atlaskit/heading";
import { Inline, Text } from "@atlaskit/primitives/compiled";

export default function RelayRoomLogo() {
  return (
    <Inline alignBlock="center" space="space.100">
      <Heading size="small" as="div">
        Relay Room
      </Heading>
      <Text size="small" color="color.text.subtle">
        control room
      </Text>
    </Inline>
  );
}
