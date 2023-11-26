const birthday = new Date('2001-06-28');

export const getAge = () => {
  return Math.floor((Date.now() - birthday.getTime()) / 31557600000);
}