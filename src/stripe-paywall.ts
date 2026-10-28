import Stripe from 'stripe';

export interface PaywallConfig {
  stripeSecretKey: string;
  successUrl: string;
  cancelUrl: string;
}

export class ArgonPaywallEngine {
  private stripe: Stripe;
  private successUrl: string;
  private cancelUrl: string;

  constructor(config: PaywallConfig) {
    this.stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
    this.successUrl = config.successUrl;
    this.cancelUrl = config.cancelUrl;
  }

  /**
   * Creates an immediate 50% Sprint Kickoff Deposit session ($1,750 USD).
   */
  async createSprintDepositSession(clientEmail: string, companyName: string): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: clientEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 175000, // $1,750.00
            product_data: {
              name: `72-Hour Hardened Automation Sprint (50% Kickoff Deposit) - ${companyName}`,
              description:
                'Includes custom MCP server wrapping target portal, deterministic DOM attestation layer, and Dockerized PR handoff by Friday 5 PM CST.',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        company: companyName,
        type: '72_hour_sprint_deposit',
      },
      success_url: this.successUrl,
      cancel_url: this.cancelUrl,
    });

    if (!session.url) {
      throw new Error('Failed to generate Stripe checkout URL.');
    }
    return session.url;
  }

  /**
   * Creates an Ephemeral Deal Room artifact unlock session ($1,500 USD).
   */
  async createArtifactUnlockSession(artifactHash: string, clientEmail?: string): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: clientEmail,
      client_reference_id: artifactHash,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 150000, // $1,500.00
            product_data: {
              name: `Verified Artifact Unlock [Hash: ${artifactHash.substring(0, 12)}...]`,
              description: 'Full unredacted statutory dataset, SHA-256 DOM attestation proof, and live MCP endpoint.',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        artifactHash,
        type: 'artifact_unlock',
      },
      success_url: `${this.successUrl}?hash=${artifactHash}`,
      cancel_url: this.cancelUrl,
    });

    if (!session.url) {
      throw new Error('Failed to generate Stripe checkout URL.');
    }
    return session.url;
  }
}
