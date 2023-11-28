const birthday = new Date('2001-06-28');
const fullName = 'Kristian Binau';
const jobTitle = 'Full-Stack Developer';

export const getAge = () => {
  return Math.floor((Date.now() - birthday.getTime()) / 31557600000);
}

export const getFullName = () => {
  return fullName;
}

export const getShortName = () => {
  return fullName.split(' ')[0];
}

export const getJobTitle = () => {
  return jobTitle;
}

export const getShortDescription = () => {
  return `${getAge()} years-old, recently graduated. ${getJobTitle()}, passionate about security, programming, privacy.`;
}