import { zodResolver } from '@hookform/resolvers/zod';
import {
  generateReportId,
  HAZARD_TYPE_LABELS,
  HAZARD_TYPES,
  hazardReportInputSchema,
  layout,
  SEVERITIES,
  SEVERITY_LABELS,
  toErrorMessage,
  type HazardReportInput,
} from '@lankashield/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Banner, Button, Text } from 'react-native-paper';

import { FormTextField } from '@/components/FormTextField';
import { ScreenContainer } from '@/components/ScreenContainer';
import { DistrictPicker } from '@/features/hazard-reports/components/DistrictPicker';
import { EvidenceField } from '@/features/hazard-reports/components/EvidenceField';
import { FormSection } from '@/features/hazard-reports/components/FormSection';
import { LocationField } from '@/features/hazard-reports/components/LocationField';
import { OptionChips } from '@/features/hazard-reports/components/OptionChips';
import { HAZARD_ICONS } from '@/features/hazard-reports/hazardIcons';
import {
  submitHazardReport,
  type SubmitProgress,
} from '@/features/hazard-reports/hazardReport.service';
import { useAuthStore } from '@/store/authStore';

const HAZARD_OPTIONS = HAZARD_TYPES.map((value) => ({
  value,
  label: HAZARD_TYPE_LABELS[value],
  icon: HAZARD_ICONS[value],
}));
const SEVERITY_OPTIONS = SEVERITIES.map((value) => ({ value, label: SEVERITY_LABELS[value] }));

const EMPTY_FORM: Partial<HazardReportInput> = { title: '', description: '', evidence: [] };

function progressLabel(progress: SubmitProgress | null): string {
  if (!progress) return 'Submit report';
  if (progress.step === 'checking') return 'Checking connection…';
  if (progress.step === 'uploading')
    return `Uploading photo ${progress.current} of ${progress.total}…`;
  return 'Saving report…';
}

export default function ReportScreen() {
  const user = useAuthStore((s) => s.user);
  // One tracking ID per draft: a retry after a failure reuses it, so nothing is duplicated.
  const [reportId, setReportId] = useState(() => generateReportId());
  const [progress, setProgress] = useState<SubmitProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, setValue, reset, formState } = useForm<HazardReportInput>({
    resolver: zodResolver(hazardReportInputSchema),
    defaultValues: EMPTY_FORM,
  });
  const submitting = formState.isSubmitting;
  const errors = formState.errors;

  const onSubmit = handleSubmit(async (input) => {
    if (!user) return;
    setError(null);
    try {
      await submitHazardReport({
        reportId,
        input,
        reporter: user,
        clientCreatedAt: new Date().toISOString(),
        onProgress: setProgress,
      });
      reset(EMPTY_FORM);
      setReportId(generateReportId());
      router.push({ pathname: '/report-submitted', params: { reportId } });
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setProgress(null);
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer scroll>
        <Text variant="headlineSmall">Report a hazard</Text>

        <Banner
          visible={!!error}
          icon="alert-circle-outline"
          actions={[{ label: 'Retry', onPress: onSubmit, disabled: submitting }]}>
          {error ?? ''}
        </Banner>

        <Controller
          control={control}
          name="hazardType"
          render={({ field }) => (
            <FormSection label="Hazard type" error={errors.hazardType?.message}>
              <OptionChips
                options={HAZARD_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                disabled={submitting}
              />
            </FormSection>
          )}
        />

        <Controller
          control={control}
          name="severity"
          render={({ field }) => (
            <FormSection label="Severity" error={errors.severity?.message}>
              <OptionChips
                options={SEVERITY_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                disabled={submitting}
              />
            </FormSection>
          )}
        />

        <FormSection label="Details">
          <FormTextField
            control={control}
            name="title"
            label="Short title"
            placeholder="e.g. River overflowing near the bridge"
            disabled={submitting}
          />
          <FormTextField
            control={control}
            name="description"
            label="Description"
            placeholder="What is happening, who is affected, how fast is it changing?"
            multiline
            numberOfLines={4}
            disabled={submitting}
          />
        </FormSection>

        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <FormSection
              label="Location"
              error={errors.location?.message ?? errors.location?.latitude?.message}>
              <LocationField
                value={field.value}
                onChange={field.onChange}
                onDistrictDetected={(district) =>
                  setValue('district', district, { shouldValidate: formState.isSubmitted })
                }
                disabled={submitting}
              />
            </FormSection>
          )}
        />

        <Controller
          control={control}
          name="district"
          render={({ field, fieldState }) => (
            <FormSection
              label="District"
              hint="Filled in from your location when possible."
              error={fieldState.error?.message}>
              <DistrictPicker
                value={field.value}
                onChange={field.onChange}
                disabled={submitting}
                error={!!fieldState.error}
              />
            </FormSection>
          )}
        />

        <Controller
          control={control}
          name="evidence"
          render={({ field }) => (
            <FormSection
              label="Photos (optional)"
              error={errors.evidence?.message ?? errors.evidence?.root?.message}>
              <EvidenceField
                value={field.value ?? []}
                onChange={field.onChange}
                disabled={submitting}
              />
            </FormSection>
          )}
        />

        <Button
          mode="contained"
          icon="send"
          onPress={onSubmit}
          loading={submitting}
          disabled={submitting}
          contentStyle={styles.button}>
          {progressLabel(progress)}
        </Button>
        <Text variant="bodySmall" style={styles.trackingHint}>
          Tracking ID for this report: {reportId}
        </Text>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: { height: layout.buttonHeight },
  trackingHint: { textAlign: 'center', opacity: 0.7 },
});
