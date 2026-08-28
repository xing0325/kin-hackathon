cmake_minimum_required(VERSION 3.16)

# Use the organizer's pinned Agent_link SDK directly; board/product code stays here.
set(EXTRA_COMPONENT_DIRS
    "${CMAKE_CURRENT_LIST_DIR}/../../work/Agent_link/components/agent_link")

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(node_cardputer_adv)
