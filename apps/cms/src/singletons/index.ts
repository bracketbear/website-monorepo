import { singleton, fields } from '@keystatic/core';
import { makeIndexPageSchema } from '../schemas/index-page';
import { makePageSchema } from '../schemas/page';

const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const singletonPath = (singletonName: string) =>
  `content/pages/${singletonName}` as const;

const generalSingletonPath = (singletonName: string) =>
  `content/${singletonName}` as const;

const siteSingletonPath = (site: string, singletonName: string) =>
  `content/sites/${site}/${singletonName}` as const;

export const singletons = {
  // Legacy singletons (for backward compatibility)
  indexPage: singleton({
    label: 'Homepage',
    path: singletonPath('index-page'),
    schema: makeIndexPageSchema(),
    format: 'json',
  }),
  contactPage: singleton({
    label: 'Contact Page',
    path: singletonPath('contact-page'),
    schema: makePageSchema({
      phone: fields.text({ label: 'Phone' }),
      address: fields.text({ label: 'Address' }),
      contactFormId: fields.text({ label: 'Contact Form ID' }),
      officeHours: fields.text({ label: 'Office Hours' }),
    }),
    format: 'json',
  }),
  aboutPage: singleton({
    label: 'About Page',
    path: singletonPath('about-page'),
    schema: makePageSchema({
      teamMembers: fields.array(
        fields.object({
          name: fields.text({ label: 'Name' }),
          role: fields.text({ label: 'Role' }),
          bio: fields.text({ label: 'Bio', multiline: true }),
          image: fields.text({ label: 'Image URL' }),
        }),
        {
          label: 'Team Members',
          itemLabel: (props) => props.fields.name.value || 'New Member',
        }
      ),
      companyValues: fields.array(fields.text({ label: 'Value' }), {
        label: 'Company Values',
        itemLabel: (props) => props.value || 'New Value',
      }),
      foundedYear: fields.integer({ label: 'Founded Year' }),
    }),
    format: 'json',
  }),

  // Portfolio site singletons
  portfolioIndexPage: singleton({
    label: 'Portfolio Homepage',
    path: siteSingletonPath('portfolio', 'index-page'),
    schema: makeIndexPageSchema(),
    format: 'json',
  }),
  portfolioContactPage: singleton({
    label: 'Portfolio Contact Page',
    path: siteSingletonPath('portfolio', 'contact-page'),
    schema: makePageSchema({
      phone: fields.text({ label: 'Phone' }),
      address: fields.text({ label: 'Address' }),
      contactFormId: fields.text({ label: 'Contact Form ID' }),
      officeHours: fields.text({ label: 'Office Hours' }),
    }),
    format: 'json',
  }),
  portfolioAboutPage: singleton({
    label: 'Portfolio About Page',
    path: siteSingletonPath('portfolio', 'about-page'),
    schema: makePageSchema({
      teamMembers: fields.array(
        fields.object({
          name: fields.text({ label: 'Name' }),
          role: fields.text({ label: 'Role' }),
          bio: fields.text({ label: 'Bio', multiline: true }),
          image: fields.text({ label: 'Image URL' }),
        }),
        {
          label: 'Team Members',
          itemLabel: (props) => props.fields.name.value || 'New Member',
        }
      ),
      companyValues: fields.array(fields.text({ label: 'Value' }), {
        label: 'Company Values',
        itemLabel: (props) => props.value || 'New Value',
      }),
      foundedYear: fields.integer({ label: 'Founded Year' }),
    }),
    format: 'json',
  }),

  // Bracket Bear site singletons
  bracketbearIndexPage: singleton({
    label: 'Bracket Bear Homepage',
    path: siteSingletonPath('bracketbear', 'index-page'),
    schema: makeIndexPageSchema(),
    format: 'json',
  }),
  bracketbearContactPage: singleton({
    label: 'Bracket Bear Contact Page',
    path: siteSingletonPath('bracketbear', 'contact-page'),
    schema: makePageSchema({
      phone: fields.text({ label: 'Phone' }),
      address: fields.text({ label: 'Address' }),
      contactFormId: fields.text({ label: 'Contact Form ID' }),
      officeHours: fields.text({ label: 'Office Hours' }),
    }),
    format: 'json',
  }),
  bracketbearAboutPage: singleton({
    label: 'Bracket Bear About Page',
    path: siteSingletonPath('bracketbear', 'about-page'),
    schema: makePageSchema({
      teamMembers: fields.array(
        fields.object({
          name: fields.text({ label: 'Name' }),
          role: fields.text({ label: 'Role' }),
          bio: fields.text({ label: 'Bio', multiline: true }),
          image: fields.text({ label: 'Image URL' }),
        }),
        {
          label: 'Team Members',
          itemLabel: (props) => props.fields.name.value || 'New Member',
        }
      ),
      companyValues: fields.array(fields.text({ label: 'Value' }), {
        label: 'Company Values',
        itemLabel: (props) => props.value || 'New Value',
      }),
      foundedYear: fields.integer({ label: 'Founded Year' }),
    }),
    format: 'json',
  }),

  // General singletons
  contactInfo: singleton({
    label: 'Contact Info',
    schema: {
      email: fields.text({
        label: 'Email',
        validation: {
          isRequired: true,
          pattern: { regex: emailRegex, message: 'Invalid email' },
        },
      }),
      linkedin: fields.url({ label: 'LinkedIn' }),
      github: fields.url({ label: 'GitHub' }),
    },
    format: 'json',
    path: generalSingletonPath('contact-info'),
  }),
  siteSettings: singleton({
    label: 'Site Settings',
    schema: {
      siteName: fields.text({
        label: 'Site Name',
        validation: { isRequired: true },
      }),
      siteDescription: fields.text({ label: 'Site Description' }),
      logo: fields.image({ label: 'Logo' }),
      favicon: fields.image({ label: 'Favicon' }),
    },
    format: 'json',
    path: generalSingletonPath('site-settings'),
  }),
};
