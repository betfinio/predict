import { memo } from 'react';
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';

const PriceChart = () => {
	return (
		<AdvancedRealTimeChart
			style={'2'}
			theme="dark"
			symbol={'BTCUSDT'}
			interval={'1'}
			enable_publishing={false}
			toolbar_bg={'#f1f3f6'}
			save_image={false}
			disabled_features={[
				'header_widget',
				'header_interval_dialog_button',
				'timezone_menu',
				'create_volume_indicator_by_default',
				'control_bar',
				'timeframes_toolbar',
				'side_toolbar_in_fullscreen_mode',
				'header_settings',
			]}
			autosize
			hide_top_toolbar={true}
			allow_symbol_change={false}
			hide_side_toolbar={true}
			hide_legend={true}
		/>
	);
};

export default memo(PriceChart);
