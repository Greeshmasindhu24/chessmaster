export type Gender =
  | 'male'
  | 'female'
  | 'non_binary'
  | 'prefer_not_to_say'

export type Country =
  | 'indian'
  | 'outside_indian'
  | 'prefer_not_to_say'

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export const COUNTRY_OPTIONS: { value: Country; label: string }[] = [
  { value: 'indian', label: 'Indian' },
  { value: 'outside_indian', label: 'Outside Indian' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export function genderLabel(value: Gender | string | null | undefined): string {
  return GENDER_OPTIONS.find((o) => o.value === value)?.label ?? '—'
}

export function countryLabel(value: Country | string | null | undefined): string {
  return COUNTRY_OPTIONS.find((o) => o.value === value)?.label ?? (value ? String(value) : '—')
}

export function ageFromDateOfBirth(dob: string | null | undefined): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

export const MIN_REGISTRATION_AGE = 13

export function validateDateOfBirth(dob: string): string | null {
  if (!dob) return 'Date of birth is required'
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return 'Enter a valid date of birth'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (birth > today) return 'Date of birth cannot be in the future'
  const age = ageFromDateOfBirth(dob)
  if (age === null) return 'Enter a valid date of birth'
  if (age < MIN_REGISTRATION_AGE) {
    return `You must be at least ${MIN_REGISTRATION_AGE} years old to register`
  }
  return null
}
