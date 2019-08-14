import $ from 'jquery'
import { BigNumber } from 'bignumber.js'
import { openModal, openErrorModal, lockModal } from '../../lib/modals'
import { makeContractCall, setupChart } from './utils'

export function openMoveStakeModal (event, store) {
  const fromAddress = $(event.target).closest('[data-address]').data('address')

  store.getState().channel
    .push('render_move_stake', { from: fromAddress, to: null, amount: null })
    .receive('ok', msg => {
      const $modal = $(msg.html)
      setupModal($modal, fromAddress, store, msg)
      openModal($modal)
    })
}

function setupModal ($modal, fromAddress, store, msg) {
  setupChart($modal.find('.js-pool-from-progress'), msg.from_self_staked_amount, msg.from_staked_amount)
  if ($modal.find('.js-pool-to-progress').length) {
    setupChart($modal.find('.js-pool-to-progress'), msg.to_self_staked_amount, msg.to_staked_amount)
  }

  $modal.find('form').submit(() => {
    moveStake($modal, fromAddress, store, msg)
    return false
  })
  $modal.find('[pool-select]').on('change', event => {
    const toAddress = $modal.find('[pool-select]').val()
    const amount = $modal.find('[move-amount]').val()

    store.getState().channel
      .push('render_move_stake', { from: fromAddress, to: toAddress, amount })
      .receive('ok', msg => {
        $modal.html($(msg.html).html())
        $modal.addClass('show').css('padding-right: 12px; display: block;')
        setupModal($modal, fromAddress, store, msg)
      })
  })
}

function moveStake ($modal, fromAddress, store, msg) {
  lockModal($modal)

  const stakingContract = store.getState().stakingContract
  const decimals = store.getState().tokenDecimals

  const minStake = new BigNumber(msg.min_delegator_stake)
  const currentStake = new BigNumber(msg.delegator_staked)
  const maxAllowed = new BigNumber(msg.max_withdraw_allowed)
  const stake = new BigNumber($modal.find('[move-amount]').val().replace(',', '.').trim()).shiftedBy(decimals).integerValue()

  if (!stake.isPositive() || stake.isGreaterThan(maxAllowed)) {
    openErrorModal('Error', `You cannot move more than ${maxAllowed.shiftedBy(-decimals)} ${store.getState().tokenSymbol} right now`)
    return false
  }

  if (!stake.isPositive() || stake.plus(currentStake).isLessThan(minStake)) {
    openErrorModal('Error', `You cannot move less than ${minStake.shiftedBy(-decimals)} ${store.getState().tokenSymbol} to this pool`)
    return false
  }

  const toAddress = $modal.find('[pool-select]').val()
  makeContractCall(stakingContract.methods.moveStake(fromAddress, toAddress, stake.toString()), store)
}
