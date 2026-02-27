import type {
  ReportTemplate,
  TemplateId,
  TemplateSection,
  SectionType,
} from "@/types/template";
import type { CustomTemplateConfig } from "@/types/builder";
import { salesReportTemplate } from "./sales-report";
import { socialMediaTemplate } from "./social-media";
import { cryptoWalletTemplate } from "./crypto-wallet";
import { analyticsTemplate } from "./analytics";
import { customTemplate } from "./custom";
import { shopifySalesTemplate } from "./shopify-sales";
import { shopifyProductsTemplate } from "./shopify-products";
import { shopifyCustomersTemplate } from "./shopify-customers";
import { ebaySalesTemplate } from "./ebay-sales";
import { ebayListingsTemplate } from "./ebay-listings";
import { ebayFinancialTemplate } from "./ebay-financial";

const TEMPLATES: Record<string, ReportTemplate> = {
  "sales-report": salesReportTemplate,
  "social-media": socialMediaTemplate,
  "crypto-wallet": cryptoWalletTemplate,
  ecommerce: salesReportTemplate,
  analytics: analyticsTemplate,
  financial: salesReportTemplate,
  "shopify-sales": shopifySalesTemplate,
  "shopify-products": shopifyProductsTemplate,
  "shopify-customers": shopifyCustomersTemplate,
  "ebay-sales": ebaySalesTemplate,
  "ebay-listings": ebayListingsTemplate,
  "ebay-financial": ebayFinancialTemplate,
  custom: customTemplate,
};

export function getTemplate(id: TemplateId | string): ReportTemplate {
  return TEMPLATES[id] ?? customTemplate;
}

export function getAllTemplates(): ReportTemplate[] {
  return [
    salesReportTemplate,
    socialMediaTemplate,
    cryptoWalletTemplate,
    analyticsTemplate,
    shopifySalesTemplate,
    shopifyProductsTemplate,
    shopifyCustomersTemplate,
    ebaySalesTemplate,
    ebayListingsTemplate,
    ebayFinancialTemplate,
    customTemplate,
  ];
}

/**
 *convert a saved CustomTemplateConfig (from UserTemplate.config) into
 *a ReportTemplate that the report generation pipeline can consume.
 */
export function buildTemplateFromConfig(
  id: string,
  name: string,
  description: string,
  config: CustomTemplateConfig
): ReportTemplate {
  const sections: TemplateSection[] = config.sections
    .filter((s) => s.type !== "text_block")
    .map((s) => ({
      type: s.type as SectionType,
      title: s.title,
      pageBreakBefore: s.pageBreakBefore,
    }));

  return {
    id,
    name,
    description,
    sections,
    colorScheme: config.colorScheme,
    preferredCharts: config.preferredCharts,
    pageSize: config.pageSize,
  };
}
