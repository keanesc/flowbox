import Button from "@atlaskit/button/new";
import Form, {
  ErrorMessage,
  Field,
  FormFooter,
  FormHeader,
  FormSection,
} from "@atlaskit/form";
import Heading from "@atlaskit/heading";
import SectionMessage from "@atlaskit/section-message";
import TextField from "@atlaskit/textfield";
import { Stack, Box, Text } from "@atlaskit/primitives/compiled";
import RelayRoomLogo from "./relay-room-logo";
import { styles } from "./ui-styles";

type SignInValues = { email: string; password: string };

export default function SignInScreen({
  isLoading,
  error,
  onSubmit,
}: {
  isLoading: boolean;
  error?: string;
  onSubmit: (values: SignInValues) => void;
}) {
  return (
    <Box xcss={styles.auth}>
      <Box xcss={styles.authCard}>
        <Stack space="space.300">
          <RelayRoomLogo />
          <Stack space="space.100">
            <Heading size="xlarge">Sign in to your control room</Heading>
            <Text as="p" color="color.text.subtle">
              Use your Relay Room account to access organization-scoped
              workflows and run history.
            </Text>
          </Stack>
          {error && <SectionMessage appearance="error">{error}</SectionMessage>}
          <Form<SignInValues>
            onSubmit={(values) => {
              onSubmit(values);
              return Promise.resolve();
            }}
          >
            {({ formProps, submitting }) => (
              <form {...formProps}>
                <FormHeader title="Account details" />
                <FormSection>
                  <Field
                    name="email"
                    label="Email"
                    isRequired
                    validate={(value) =>
                      value ? undefined : "Email is required"
                    }
                  >
                    {({ fieldProps, error: fieldError }) => (
                      <>
                        <TextField
                          type="email"
                          autoComplete="email"
                          {...fieldProps}
                        />
                        {fieldError && (
                          <ErrorMessage>{fieldError}</ErrorMessage>
                        )}
                      </>
                    )}
                  </Field>
                  <Field
                    name="password"
                    label="Password"
                    isRequired
                    validate={(value) =>
                      value ? undefined : "Password is required"
                    }
                  >
                    {({ fieldProps, error: fieldError }) => (
                      <>
                        <TextField
                          type="password"
                          autoComplete="current-password"
                          {...fieldProps}
                        />
                        {fieldError && (
                          <ErrorMessage>{fieldError}</ErrorMessage>
                        )}
                      </>
                    )}
                  </Field>
                </FormSection>
                <FormFooter>
                  <Button
                    appearance="primary"
                    type="submit"
                    isDisabled={isLoading || submitting}
                  >
                    {isLoading || submitting ? "Signing in…" : "Sign in"}
                  </Button>
                </FormFooter>
              </form>
            )}
          </Form>
        </Stack>
      </Box>
    </Box>
  );
}
