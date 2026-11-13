import { githubUrl } from './model';
it.each(['javascript:alert(1)', 'https://github.com.evil.test', 'https://user:secret@github.com', 'http://github.com'])('rejects external or unsafe links: %s', url => {
  expect(githubUrl(url)).toBeNull();
});
